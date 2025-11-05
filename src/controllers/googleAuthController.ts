import { Request, Response } from 'express';
import { googleAuthService } from '../services/googleAuthService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

export const googleAuthController = {
  /**
   * POST /api/v1/auth/google
   * Handle Google OAuth login/signup
   */
  async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { googleToken, email, name, picture, googleId } = req.body;

      // Validate required fields
      if (!email) {
        sendError(res, 'Email is required', 'Missing email from Google auth', 400);
        return;
      }

      // Handle Google authentication
      const result = await googleAuthService.handleGoogleAuth({
        id: googleId || email, // Use googleId if provided, fallback to email
        email,
        name: name || email.split('@')[0],
        picture: picture || null,
      });

      sendSuccess(res, 'Google login successful', result);
    } catch (error: any) {
      logger.error('Google login failed:', error);
      sendError(res, error.message || 'Google authentication failed', error.toString(), 400);
    }
  },
};
