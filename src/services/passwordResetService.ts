import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';
import { emailService } from './emailService';

/**
 * PASSWORD RESET SERVICE - DATABASE-BACKED OTP STORAGE
 * Uses Supabase password_resets table for production-ready OTP management
 * 
 * MIGRATION REQUIRED: See MIGRATION_NOTES.md
 */

export const passwordResetService = {
  /**
   * Generate and send OTP for password reset
   */
  async sendResetOTP(email: string): Promise<void> {
    try {
      // Check if user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, user_name')
        .eq('email', email)
        .single();

      if (userError || !user) {
        // Don't reveal if user exists or not (security best practice)
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return; // Still return success to prevent email enumeration
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      logger.info(`🔐 Generated OTP for ${email}: ${otp.substring(0, 2)}****`);
      
      // Store OTP in database (expires in 10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      logger.info(`⏰ OTP expires at: ${expiresAt}`);
      
      // Delete any existing OTP for this email first
      await supabaseAdmin
        .from('password_resets')
        .delete()
        .eq('email', email);
      
      // Insert new OTP
      const { error: otpError } = await supabaseAdmin
        .from('password_resets')
        .insert({
          email,
          otp,
          expires_at: expiresAt,
          attempts: 0
        });
      
      if (otpError) {
        logger.error(`❌ Failed to store OTP in database: ${otpError.message}`);
        throw new Error('Failed to generate OTP');
      }
      
      logger.info(`✅ OTP stored in database successfully`);

      // Send OTP via email
      logger.info(`📤 Sending OTP email to ${email}...`);
      const sent = await emailService.sendPasswordResetOTP(email, otp, user.user_name);
      
      if (!sent) {
        logger.error(`❌ Email service returned false - email not sent`);
        throw new Error('Failed to send OTP email');
      }
      
      logger.info(`✅ OTP process completed successfully for ${email}`);

      logger.info(`✅ Password reset OTP sent to ${email} (expires in 10 min)`);
    } catch (error: any) {
      logger.error(`Error sending reset OTP: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  /**
   * Verify OTP and reset password
   */
  async verifyOTPAndResetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    try {
      // Get OTP data from database
      const { data: otpData, error: fetchError } = await supabaseAdmin
        .from('password_resets')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !otpData) {
        throw new Error('No OTP found for this email. Please request a new one.');
      }

      // Check if expired
      if (new Date(otpData.expires_at) < new Date()) {
        await supabaseAdmin.from('password_resets').delete().eq('email', email);
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check attempts (max 5 attempts)
      if (otpData.attempts >= 5) {
        await supabaseAdmin.from('password_resets').delete().eq('email', email);
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        // Increment attempts
        await supabaseAdmin
          .from('password_resets')
          .update({ attempts: otpData.attempts + 1 })
          .eq('email', email);
        throw new Error('Invalid OTP. Please try again.');
      }

      // OTP is valid, proceed with password reset
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ password_hash: hashedPassword })
        .eq('email', email);

      if (updateError) {
        throw new Error('Failed to reset password');
      }

      // Remove OTP after successful reset
      await supabaseAdmin
        .from('password_resets')
        .delete()
        .eq('email', email);

      logger.info(`✅ Password reset successfully for ${email}`);
    } catch (error: any) {
      logger.error(`Error verifying OTP and resetting password: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  /**
   * Resend OTP (with rate limiting)
   */
  async resendOTP(email: string): Promise<void> {
    try {
      // Check if recent OTP exists
      const { data: existing } = await supabaseAdmin
        .from('password_resets')
        .select('created_at')
        .eq('email', email)
        .single();
      
      // Rate limit: can only resend after 1 minute
      if (existing) {
        const createdAt = new Date(existing.created_at).getTime();
        const now = Date.now();
        if ((now - createdAt) < 60 * 1000) {
          throw new Error('Please wait 1 minute before requesting a new OTP');
        }
      }

      // Send new OTP
      await this.sendResetOTP(email);
    } catch (error: any) {
      logger.error(`Error resending OTP: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  /**
   * Verify OTP only (without resetting password)
   */
  async verifyOTP(email: string, otp: string): Promise<void> {
    try {
      // Get OTP data from database
      const { data: otpData, error: fetchError } = await supabaseAdmin
        .from('password_resets')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !otpData) {
        throw new Error('No OTP found for this email. Please request a new one.');
      }

      // Check if expired
      if (new Date(otpData.expires_at) < new Date()) {
        await supabaseAdmin.from('password_resets').delete().eq('email', email);
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check attempts (max 5 attempts)
      if (otpData.attempts >= 5) {
        await supabaseAdmin.from('password_resets').delete().eq('email', email);
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        // Increment attempts
        await supabaseAdmin
          .from('password_resets')
          .update({ attempts: otpData.attempts + 1 })
          .eq('email', email);
        throw new Error('Invalid OTP. Please try again.');
      }

      // OTP is valid - mark as verified (update attempts to indicate success)
      await supabaseAdmin
        .from('password_resets')
        .update({ attempts: -1 }) // Use -1 to indicate verified but not used
        .eq('email', email);

      logger.info(`✅ OTP verified successfully for ${email}`);
    } catch (error: any) {
      logger.error(`Error verifying OTP: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },

  /**
   * Reset password for already verified OTP
   */
  async resetPasswordWithVerifiedOTP(email: string, newPassword: string): Promise<void> {
    try {
      // Check if OTP was previously verified (attempts = -1)
      const { data: otpData, error: fetchError } = await supabaseAdmin
        .from('password_resets')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !otpData) {
        throw new Error('No verified OTP found. Please verify OTP first.');
      }

      if (otpData.attempts !== -1) {
        throw new Error('OTP not verified. Please verify OTP first.');
      }

      // Check if expired (even after verification)
      if (new Date(otpData.expires_at) < new Date()) {
        await supabaseAdmin.from('password_resets').delete().eq('email', email);
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Reset password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ password_hash: hashedPassword })
        .eq('email', email);

      if (updateError) {
        throw new Error('Failed to reset password');
      }

      // Remove OTP after successful reset
      await supabaseAdmin
        .from('password_resets')
        .delete()
        .eq('email', email);

      logger.info(`✅ Password reset successfully for ${email} with verified OTP`);
    } catch (error: any) {
      logger.error(`Error resetting password with verified OTP: ${error.message || JSON.stringify(error)}`);
      throw error;
    }
  },
};
