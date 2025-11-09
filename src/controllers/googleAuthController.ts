import { Request, Response } from 'express';
import { googleAuthService } from '../services/googleAuthService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';
import { OAuth2Client } from 'google-auth-library';

// Initialize OAuth2 client lazily to avoid initialization issues
let client: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback'
    );
  }
  return client;
}

export const googleAuthController = {
  /**
   * GET /api/v1/auth/google
   * Get Google OAuth URL
   */
  async getGoogleAuthUrl(req: Request, res: Response): Promise<void> {
    try {
      const authUrl = getOAuthClient().generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        prompt: 'consent',
      });

      sendSuccess(res, 'Google OAuth URL generated', { url: authUrl });
    } catch (error: any) {
      logger.error('Failed to generate Google OAuth URL:', error);
      sendError(res, 'Failed to generate OAuth URL', error.toString(), 500);
    }
  },

  /**
   * POST /api/v1/auth/google/callback
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        sendError(res, 'Authorization code is required', 'Missing code', 400);
        return;
      }

      // Exchange code for tokens
      const oauthClient = getOAuthClient();
      const { tokens } = await oauthClient.getToken(code);
      oauthClient.setCredentials(tokens);

      // Get user info from Google
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        sendError(res, 'Failed to get user info from Google', 'Invalid token', 400);
        return;
      }

      // Handle Google authentication in our system
      const result = await googleAuthService.handleGoogleAuth({
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture || undefined,
      });

      sendSuccess(res, 'Google login successful', result);
    } catch (error: any) {
      logger.error('Google callback failed:', error);
      sendError(res, error.message || 'Google authentication failed', error.toString(), 400);
    }
  },

  /**
   * POST /api/v1/auth/google (Legacy - for direct token verification)
   * Handle Google OAuth login/signup with pre-verified token
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
        id: googleId || email,
        email,
        name: name || email.split('@')[0],
        picture: picture || undefined,
      });

      sendSuccess(res, 'Google login successful', result);
    } catch (error: any) {
      logger.error('Google login failed:', error);
      sendError(res, error.message || 'Google authentication failed', error.toString(), 400);
    }
  },
};
