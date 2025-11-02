import { Request, Response } from 'express';
import { globalStatsService } from '../services/globalStatsService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

export const globalStatsController = {
  // GET /api/v1/global-stats - Get all global statistics (unified endpoint)
  async getGlobalStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId; // Optional - works with or without auth
      
      // If userId is provided, return complete stats with rank
      if (userId) {
        const stats = await globalStatsService.getCompleteGlobalStats(userId);
        sendSuccess(res, 'Global statistics retrieved successfully', stats);
      } else {
        // Return basic stats without user rank
        const stats = await globalStatsService.getGlobalStats();
        sendSuccess(res, 'Global statistics retrieved successfully', stats);
      }
    } catch (error: any) {
      logger.error('Exception in GET /global-stats:', error);
      sendError(res, error.message || 'Failed to get global statistics', error.toString(), 500);
    }
  },

  // GET /api/v1/user-compute-stats - Get user compute statistics
  async getUserComputeStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await globalStatsService.getUserComputeStats();
      sendSuccess(res, 'User compute statistics retrieved successfully', stats);
    } catch (error: any) {
      logger.error('Exception in GET /user-compute-stats:', error);
      sendError(res, error.message || 'Failed to get user compute statistics', error.toString(), 500);
    }
  }
};
