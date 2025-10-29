import { Request, Response } from 'express';
import { dailyCheckinService } from '../services/dailyCheckinService';
import { sendSuccess, sendError } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const dailyCheckinController = {
  // GET /api/v1/daily-checkins/streak - Get current streak
  async getStreak(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      const streakData = await dailyCheckinService.getStreak(userId);
      sendSuccess(res, 'Streak data retrieved successfully', streakData);
    } catch (error: any) {
      logger.error('Exception in GET /daily-checkins/streak:', error);
      sendError(res, error.message || 'Failed to get streak data', error.toString(), 500);
    }
  },

  // POST /api/v1/daily-checkins - Perform daily check-in
  async performCheckin(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      const result = await dailyCheckinService.performCheckin(userId);
      sendSuccess(res, result.message, result.data);
    } catch (error: any) {
      logger.error('Exception in POST /daily-checkins:', error);
      sendError(res, error.message || 'Failed to perform check-in', error.toString(), 400);
    }
  },
};
