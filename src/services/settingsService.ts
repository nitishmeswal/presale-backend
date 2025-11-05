import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';
import { emailService } from './emailService';

export const settingsService = {
  /**
   * Delete user account and all associated data
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    try {
      // Get user details
      const { data: user, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('email, user_name, password_hash')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      logger.info(`🗑️ Deleting account for user: ${user.email}`);

      // Delete all user data in order (to avoid foreign key constraints)
      const tablesToDelete = [
        'sessions',
        'devices',
        'earnings',
        'earnings_history',
        'tasks',
        'daily_checkins',
        'referrals',
        'support_tickets',
        'earnings_leaderboard',
      ];

      for (const table of tablesToDelete) {
        try {
          const { error } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('user_id', userId);

          if (error) {
            logger.warn(`⚠️ Could not delete from ${table}:`, error.message);
          } else {
            logger.info(`✅ Deleted ${table} data for user ${userId}`);
          }
        } catch (err) {
          logger.warn(`⚠️ Table ${table} might not exist, skipping...`);
        }
      }

      // Delete user profile last
      const { error: deleteError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete user profile: ${deleteError.message}`);
      }

      // Send confirmation email
      await emailService.sendAccountDeletionEmail(user.email, user.user_name);

      logger.info(`✅ Account deleted successfully for ${user.email}`);
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  },

  /**
   * Change user password (when logged in)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user
      const { data: user, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ password_hash: hashedPassword })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Failed to update password');
      }

      logger.info(`✅ Password changed successfully for user ${userId}`);
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  },

  /**
   * Update user profile settings
   */
  async updateSettings(userId: string, updates: {
    user_name?: string;
    email?: string;
  }): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        throw new Error('Failed to update settings');
      }

      logger.info(`✅ Settings updated for user ${userId}`);
    } catch (error) {
      logger.error('Error updating settings:', error);
      throw error;
    }
  },
};
