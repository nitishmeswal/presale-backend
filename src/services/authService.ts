import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/database';
import { generateToken } from '../config/auth';
import { generateReferralCode } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';
import { AuthResponse, User, UpdateProfileRequest } from '../types/auth';

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

    // If referral code provided, create referral record
    if (referralCode) {
      await supabaseAdmin.from('referrals').insert({
        referral_code: referralCode,
        referred_user_id: newUser.id,
        status: 'active',
      });
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
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
    };

    return { user: userData, token };
  },

  async getProfile(userId: string): Promise<User> {
    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Get total earnings
    const { data: earnings } = await supabaseAdmin
      .from('earnings')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'confirmed');

    const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;

    return {
      id: user.id,
      email: user.email,
      username: user.user_name,
      createdAt: user.joined_at,
      totalEarnings,
      referralCode: user.referral_code,
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
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.user_name,
      createdAt: updatedUser.joined_at,
      referralCode: updatedUser.referral_code,
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
