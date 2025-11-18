import { Request, Response } from 'express';
import { globalStatsService } from '../services/globalStatsService';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

export const globalStatsController = {
  // GET /api/v1/global-stats - Get all global statistics (unified endpoint)
  async getGlobalStats(req: Request, res: Response): Promise<void> {
    try {
      // Extract userId from authenticated request (JWTPayload has userId property)
      const userId = req.user?.userId;
      
      logger.info(`📊 GET /global-stats - userId: ${userId || 'not authenticated'}`);
      logger.info(`🔑 req.user object: ${JSON.stringify(req.user)}`);
      
      // Always use getCompleteGlobalStats (it handles null userId gracefully)
      const stats = await globalStatsService.getCompleteGlobalStats(userId);
      sendSuccess(res, 'Global statistics retrieved successfully', stats);
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
