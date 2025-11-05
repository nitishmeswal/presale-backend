import { Request, Response } from 'express';
import { settingsService } from '../services/settingsService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

export const settingsController = {
  // DELETE /api/v1/settings/account - Delete user account
  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { password } = req.body;

      if (!userId) {
        sendError(res, 'Authentication required', 'User not authenticated', 401);
        return;
      }

      if (!password) {
        sendError(res, 'Password required', 'Please provide your password to confirm deletion', 400);
        return;
      }

      await settingsService.deleteAccount(userId, password);
      
      sendSuccess(res, 'Account deleted successfully', { deleted: true });
    } catch (error: any) {
      logger.error('Exception in DELETE /settings/account:', error);
      sendError(res, error.message || 'Failed to delete account', error.toString(), 500);
    }
  },

  // PUT /api/v1/settings/password - Change password
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { current_password, new_password } = req.body;

      if (!userId) {
        sendError(res, 'Authentication required', 'User not authenticated', 401);
        return;
      }

      if (!current_password || !new_password) {
        sendError(res, 'Missing required fields', 'Current password and new password are required', 400);
        return;
      }

      if (new_password.length < 6) {
        sendError(res, 'Invalid password', 'Password must be at least 6 characters long', 400);
        return;
      }

      await settingsService.changePassword(userId, current_password, new_password);
      
      sendSuccess(res, 'Password changed successfully', { changed: true });
    } catch (error: any) {
      logger.error('Exception in PUT /settings/password:', error);
      sendError(res, error.message || 'Failed to change password', error.toString(), 500);
    }
  },

  // PUT /api/v1/settings/profile - Update profile settings
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { user_name, email } = req.body;

      if (!userId) {
        sendError(res, 'Authentication required', 'User not authenticated', 401);
        return;
      }

      const updates: any = {};
      if (user_name) updates.user_name = user_name;
      if (email) updates.email = email;

      if (Object.keys(updates).length === 0) {
        sendError(res, 'No updates provided', 'Please provide fields to update', 400);
        return;
      }

      await settingsService.updateSettings(userId, updates);
      
      sendSuccess(res, 'Settings updated successfully', { updated: true });
    } catch (error: any) {
      logger.error('Exception in PUT /settings/profile:', error);
      sendError(res, error.message || 'Failed to update settings', error.toString(), 500);
    }
  },
};
