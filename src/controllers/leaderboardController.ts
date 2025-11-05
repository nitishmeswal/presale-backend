import { Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboardService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

export const leaderboardController = {
  // GET /api/v1/leaderboard - Get top 10 + current user's rank
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId; // Optional - works with or without auth
      
      const leaderboard = await leaderboardService.getLeaderboard(userId);
      
      sendSuccess(res, 'Leaderboard retrieved successfully', leaderboard);
    } catch (error: any) {
      logger.error('Exception in GET /leaderboard:', error);
      sendError(res, error.message || 'Failed to get leaderboard', error.toString(), 500);
    }
  },

  // GET /api/v1/leaderboard/rank - Get current user's rank
  async getUserRank(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Authentication required', 'User not authenticated', 401);
        return;
      }

      const rank = await leaderboardService.getUserRank(userId);
      
      if (!rank) {
        sendError(res, 'User rank not found', 'You have no earnings yet', 404);
        return;
      }

      sendSuccess(res, 'User rank retrieved successfully', rank);
    } catch (error: any) {
      logger.error('Exception in GET /leaderboard/rank:', error);
      sendError(res, error.message || 'Failed to get user rank', error.toString(), 500);
    }
  },
};
