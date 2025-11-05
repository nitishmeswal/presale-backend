import { supabaseAdmin, supabase } from '../config/database';
import { generateToken } from '../config/auth';
import { generateReferralCode } from '../utils/helpers';
import logger from '../utils/logger';

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
              auth_provider: 'google',
              profile_image: googleUser.picture || existingUser.profile_image
            })
            .eq('id', existingUser.id);
          
          logger.info(`✅ Migrated user to Google auth: ${googleUser.email}`);
        }
        
        logger.info(`✅ Google user logged in: ${googleUser.email}`);
      } else {
        // New Google user - create account
        const userReferralCode = generateReferralCode();
        
        const { data: newUser, error } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: googleUser.id, // Use Google's user ID
            email: googleUser.email,
            user_name: googleUser.name || googleUser.email.split('@')[0],
            auth_provider: 'google',
            password_hash: null, // No password for Google users
            profile_image: googleUser.picture || null,
            referral_code: userReferralCode,
          })
          .select()
          .single();

        if (error) {
          logger.error('Error creating Google user:', error);
          throw new Error('Failed to create user account');
        }
        
        user = newUser;
        logger.info(`✅ New Google user created: ${googleUser.email}`);
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
          profileImage: user.profile_image,
          referralCode: user.referral_code,
          plan: user.plan || 'free',
        },
        token,
      };
    } catch (error) {
      logger.error('❌ Google auth error:', error);
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
        logger.error('Google token verification failed:', error);
        throw new Error('Invalid Google token');
      }

      return data.user;
    } catch (error) {
      logger.error('Google token verification error:', error);
      throw error;
    }
  },
};
