import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { sendSuccess, sendError } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';

export const analyticsController = {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const dashboard = await analyticsService.getDashboard(userId);
      sendSuccess(res, 'Dashboard data retrieved successfully', dashboard);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get dashboard data', error.toString(), 400);
    }
  },

  async getGlobalStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await analyticsService.getGlobalStats();
      sendSuccess(res, 'Global stats retrieved successfully', stats);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get global stats', error.toString(), 400);
    }
  },

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10, period = 'all' } = req.query;
      const leaderboard = await analyticsService.getLeaderboard(
        Number(limit),
        period as string
      );
      sendSuccess(res, 'Leaderboard retrieved successfully', leaderboard);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get leaderboard', error.toString(), 400);
    }
  },
};
