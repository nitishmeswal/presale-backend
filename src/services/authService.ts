import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/database';
import { generateToken } from '../config/auth';
import { generateReferralCode } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';
import { AuthResponse, User, UpdateProfileRequest } from '../types/auth';
import { computeAppSync } from './computeAppSync';
import { referralService } from './referralService';
import logger from '../utils/logger';

export const authService = {
  async signup(
    email: string,
    password: string,
    username: string,
    referralCode?: string
  ): Promise<AuthResponse> {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error(ERROR_MESSAGES.USER_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique referral code for new user
    const userReferralCode = generateReferralCode();

    // Create user
    const { data: newUser, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        email,
        password_hash: hashedPassword,
        user_name: username,
        referral_code: userReferralCode,
        auth_provider: 'email',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // If referral code provided, verify and create referral relationship
    if (referralCode) {
      try {
        // Trim and uppercase the referral code
        const cleanCode = referralCode.trim().toUpperCase();
        logger.info(`🔗 Signup with referral code: ${cleanCode}`);
        
        // Verify the code exists
        const verification = await referralService.verifyReferralCode(cleanCode);
        
        if (verification.valid && verification.referrer) {
          // Prevent self-referral (shouldn't happen but just in case)
          if (verification.referrer.id === newUser.id) {
            logger.warn(`⚠️ User tried to refer themselves during signup`);
          } else {
            // Create proper referral with bonuses
            await referralService.createReferral(
              verification.referrer.id,  // referrer_id
              newUser.id,                // referred_user_id
              cleanCode
            );
            
            logger.info(`✅ Referral created: ${newUser.email} referred by ${verification.referrer.username}`);
          }
        } else {
          logger.warn(`⚠️ Invalid referral code during signup: ${cleanCode}`);
        }
      } catch (error: any) {
        logger.error(`Error processing referral during signup: ${error.message || JSON.stringify(error)}`);
        // Don't fail signup if referral fails
      }
    }

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
    });

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.user_name,
      createdAt: newUser.joined_at,
      referralCode: newUser.referral_code,
    };

    return { user, token };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // DUAL AUTH SUPPORT: Allow login with password if user has set one
    // Google users can add password in Settings to enable email/password login
    if (!user.password_hash) {
      throw new Error('Password not set for this account. Please login with Google or add a password in Settings.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // 🔥 SYNC PLAN FROM COMPUTE APP ON LOGIN
    let currentPlan = user.subscription_plan || 'free';
    try {
      const computeAppPlan = await computeAppSync.getUserPlan(user.email);
      if (computeAppPlan !== currentPlan) {
        logger.info(`📊 Login: Plan sync ${user.email} ${currentPlan} → ${computeAppPlan}`);
        await supabaseAdmin
          .from('user_profiles')
          .update({ subscription_plan: computeAppPlan })
          .eq('id', user.id);
        currentPlan = computeAppPlan;
      }
    } catch (syncError: any) {
      logger.error(`Error syncing plan on login: ${syncError.message || JSON.stringify(syncError)}`);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Update last login
    await supabaseAdmin
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const userData: User = {
      id: user.id,
      email: user.email,
      username: user.user_name,
      createdAt: user.joined_at,
      referralCode: user.referral_code,
      plan: currentPlan,
    };

    return { user: userData, token };
  },

  async getProfile(userId: string): Promise<User> {
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, user_name, joined_at, referral_code, wallet_address, subscription_plan')
      .eq('id', userId)
      .single();

    if (updateError || !updatedUser) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // 🔥 SYNC PLAN FROM COMPUTE APP
    let currentPlan = updatedUser.subscription_plan || 'free';
    try {
      const computeAppPlan = await computeAppSync.getUserPlan(updatedUser.email);
      
      // If plan changed, update local database
      if (computeAppPlan !== currentPlan) {
        logger.info(`📊 Plan update detected: ${updatedUser.email} ${currentPlan} → ${computeAppPlan}`);
        
        await supabaseAdmin
          .from('user_profiles')
          .update({ subscription_plan: computeAppPlan })
          .eq('id', userId);
        
        currentPlan = computeAppPlan;
        logger.info(`✅ Plan updated successfully for ${updatedUser.email}`);
      }
    } catch (syncError: any) {
      logger.error(`Error syncing plan from Compute App: ${syncError.message || JSON.stringify(syncError)}`);
      // Continue with local plan if sync fails
    }

    // Get total earnings
    const { data: earnings } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.user_name,
      createdAt: updatedUser.joined_at,
      memberSince: updatedUser.joined_at,
      totalEarnings,
      referralCode: updatedUser.referral_code,
      walletAddress: updatedUser.wallet_address || null,
      plan: currentPlan,
    };
  },

  async updateProfile(
    userId: string,
    updates: UpdateProfileRequest
  ): Promise<User> {
    const { data: updatedUser, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, email, user_name, joined_at, referral_code, wallet_address, subscription_plan')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.user_name,
      createdAt: updatedUser.joined_at,
      memberSince: updatedUser.joined_at,
      referralCode: updatedUser.referral_code,
      walletAddress: updatedUser.wallet_address || null,
      plan: updatedUser.subscription_plan || 'free',
    };
  },

  // Update task count (from old MVP)
  async updateTaskCount(userId: string, tasksToAdd: number): Promise<{ task_completed: number }> {
    // Get current task count from user_profiles table
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('task_completed')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error('Failed to fetch current task count');
    }

    const newTaskCount = (currentUser.task_completed || 0) + tasksToAdd;

    // Update the task count
    const { data: updatedUser, error } = await supabaseAdmin
      .from('user_profiles')
      .update({ task_completed: newTaskCount })
      .eq('id', userId)
      .select('task_completed')
      .single();
    
    if (error) {
      throw new Error('Failed to update task completed count');
    }

    return { task_completed: updatedUser.task_completed };
  },
};
