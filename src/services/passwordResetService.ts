import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/database';
import logger from '../utils/logger';
import { emailService } from './emailService';

// In-memory OTP store (for production, use Redis)
interface OTPData {
  otp: string;
  email: string;
  expires_at: number;
  attempts: number;
}

const otpStore = new Map<string, OTPData>();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expires_at < now) {
      otpStore.delete(email);
      logger.info(`🗑️ Expired OTP removed for ${email}`);
    }
  }
}, 5 * 60 * 1000);

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
      
      // Store OTP (expires in 10 minutes)
      const expiresAt = Date.now() + 10 * 60 * 1000;
      otpStore.set(email, {
        otp,
        email,
        expires_at: expiresAt,
        attempts: 0,
      });

      // Send OTP via email
      const sent = await emailService.sendPasswordResetOTP(email, otp, user.user_name);
      
      if (!sent) {
        throw new Error('Failed to send OTP email');
      }

      logger.info(`✅ Password reset OTP sent to ${email} (expires in 10 min)`);
    } catch (error) {
      logger.error('Error sending reset OTP:', error);
      throw error;
    }
  },

  /**
   * Verify OTP and reset password
   */
  async verifyOTPAndResetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    try {
      // Get OTP data
      const otpData = otpStore.get(email);

      if (!otpData) {
        throw new Error('No OTP found for this email. Please request a new one.');
      }

      // Check if expired
      if (Date.now() > otpData.expires_at) {
        otpStore.delete(email);
        throw new Error('OTP has expired. Please request a new one.');
      }

      // Check attempts (max 5 attempts)
      if (otpData.attempts >= 5) {
        otpStore.delete(email);
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        otpData.attempts++;
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
      otpStore.delete(email);

      logger.info(`✅ Password reset successfully for ${email}`);
    } catch (error) {
      logger.error('Error verifying OTP and resetting password:', error);
      throw error;
    }
  },

  /**
   * Resend OTP (with rate limiting)
   */
  async resendOTP(email: string): Promise<void> {
    try {
      const existing = otpStore.get(email);
      
      // Rate limit: can only resend after 1 minute
      if (existing && (existing.expires_at - Date.now()) > 9 * 60 * 1000) {
        throw new Error('Please wait before requesting a new OTP');
      }

      // Send new OTP
      await this.sendResetOTP(email);
    } catch (error) {
      logger.error('Error resending OTP:', error);
      throw error;
    }
  },
};
