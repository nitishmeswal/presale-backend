import { Request, Response } from 'express';
import { passwordResetService } from '../services/passwordResetService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

export const passwordResetController = {
  // POST /api/v1/auth/forgot-password - Send OTP for password reset
  async sendResetOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        sendError(res, 'Email required', 'Please provide your email address', 400);
        return;
      }

      await passwordResetService.sendResetOTP(email);
      
      // Always return success to prevent email enumeration
      sendSuccess(res, 'If an account exists with this email, an OTP has been sent', { sent: true });
    } catch (error: any) {
      logger.error('Exception in POST /auth/forgot-password:', error);
      // Still return success to prevent email enumeration
      sendSuccess(res, 'If an account exists with this email, an OTP has been sent', { sent: true });
    }
  },

  // POST /api/v1/auth/reset-password - Verify OTP and reset password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, new_password } = req.body;

      if (!email || !otp || !new_password) {
        sendError(res, 'Missing required fields', 'Email, OTP, and new password are required', 400);
        return;
      }

      if (new_password.length < 6) {
        sendError(res, 'Invalid password', 'Password must be at least 6 characters long', 400);
        return;
      }

      await passwordResetService.verifyOTPAndResetPassword(email, otp, new_password);
      
      sendSuccess(res, 'Password reset successfully', { reset: true });
    } catch (error: any) {
      logger.error('Exception in POST /auth/reset-password:', error);
      sendError(res, error.message || 'Failed to reset password', error.toString(), 400);
    }
  },

  // POST /api/v1/auth/resend-otp - Resend OTP
  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        sendError(res, 'Email required', 'Please provide your email address', 400);
        return;
      }

      await passwordResetService.resendOTP(email);
      
      sendSuccess(res, 'OTP resent successfully', { sent: true });
    } catch (error: any) {
      logger.error('Exception in POST /auth/resend-otp:', error);
      sendError(res, error.message || 'Failed to resend OTP', error.toString(), 400);
    }
  },
};
