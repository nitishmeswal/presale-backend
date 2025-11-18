import { supabaseAdmin, supabase } from '../config/database';
import { generateToken } from '../config/auth';
import { generateReferralCode } from '../utils/helpers';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

export const googleAuthService = {
  /**
   * Handle Google OAuth login/signup
   * Called after user authenticates with Google via Supabase Auth
   */
  async handleGoogleAuth(googleUser: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<{ user: any; token: string }> {
    try {
      // Check if user exists in our user_profiles table
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', googleUser.email)
        .single();

      let user;

      if (existingUser) {
        // Existing user - just login
        user = existingUser;
        
        // Update auth_provider if it was email before (migration case)
        if (existingUser.auth_provider !== 'google') {
          await supabaseAdmin
            .from('user_profiles')
            .update({ 
              auth_provider: 'google'
            })
            .eq('id', existingUser.id);
          
          logger.info(`✅ Migrated user to Google auth: ${googleUser.email}`);
        }
        
        logger.info(`✅ Google user logged in: ${googleUser.email}`);
      } else {
        // Check if this is a migrated user (email exists but different auth_provider)
        const { data: migratedUser } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('email', googleUser.email)
          .maybeSingle();
        
        if (migratedUser) {
          // DUAL AUTH: Link Google to existing account WITHOUT removing password
          // This allows user to login with BOTH Google and Email/Password
          await supabaseAdmin
            .from('user_profiles')
            .update({ 
              auth_provider: 'google' // Update provider but KEEP password_hash for dual auth
            })
            .eq('id', migratedUser.id);
          
          user = migratedUser;
          logger.info(`✅ Linked Google auth to existing account: ${googleUser.email} (preserved password for dual auth)`);
        } else {
          // Truly new Google user - create account
          const userReferralCode = generateReferralCode();
          const newUserId = randomUUID(); // Generate proper UUID
          
          logger.info(`🆕 Creating new Google user with UUID: ${newUserId}`);
          
          const { data: newUser, error } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: newUserId, // Use generated UUID, not Google's numeric ID
              email: googleUser.email,
              user_name: googleUser.name || googleUser.email.split('@')[0],
              auth_provider: 'google',
              password_hash: null, // No password for Google users
              referral_code: userReferralCode,
            })
            .select()
            .single();

          if (error) {
            logger.error(`Error creating Google user: ${error.message || JSON.stringify(error)}`);
            throw new Error('Failed to create user account');
          }
          
          user = newUser;
          logger.info(`✅ New Google user created: ${googleUser.email} (ID: ${newUserId})`);
        }
      }

      // Generate JWT token for our backend
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.user_name,
          referralCode: user.referral_code,
          plan: user.subscription_plan || 'free',
        },
        token,
      };
    } catch (error: any) {
      logger.error(`❌ Google auth error: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  /**
   * Verify Google ID token (alternative method)
   */
  async verifyGoogleToken(idToken: string): Promise<any> {
    try {
      // Use Supabase to verify Google token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        logger.error(`Google token verification failed: ${error.message || JSON.stringify(error)}`);
        throw new Error('Invalid Google token');
      }

      return data.user;
    } catch (error: any) {
      logger.error(`Google token verification error: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },
};
