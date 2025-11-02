import { Request, Response } from 'express';
import { earningService } from '../services/earningService';
import { sendSuccess, sendError } from '../utils/helpers';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';

export const earningController = {
  // GET /api/v1/earnings - Get earnings summary for frontend
  async getTotalEarnings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.json({
          success: true,
          data: {
            total_balance: 0,
            total_unclaimed_reward: 0,
            total_earnings: 0
          }
        });
        return;
      }
      
      const summary = await earningService.getEarningsSummary(userId);
      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      res.json({
        success: false,
        data: {
          total_balance: 0,
          total_unclaimed_reward: 0,
          total_earnings: 0
        }
      });
    }
  },

  // POST /api/v1/claim-rewards - ATOMIC claim with conditional update (from old MVP)
  async claimEarnings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const result = await earningService.claimEarningsAtomic(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  },

  async getEarningHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const history = await earningService.getEarningHistory(userId);
      sendSuccess(res, 'Earning history retrieved successfully', history);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get earning history', error.toString(), 400);
    }
  },

  // GET /api/v1/earnings/leaderboard
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const leaderboard = await earningService.getLeaderboard(limit);
      sendSuccess(res, 'Leaderboard retrieved successfully', leaderboard);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get leaderboard', error.toString(), 400);
    }
  },

  // GET /api/v1/earnings/chart?period=daily&limit=30
  async getEarningsChart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      
      // Get query params
      const period = (req.query.period as string) || 'daily';
      const limit = parseInt(req.query.limit as string) || 30;
      
      // Validate period
      if (!['daily', 'monthly', 'yearly'].includes(period)) {
        sendError(res, 'Invalid period. Must be daily, monthly, or yearly', '', 400);
        return;
      }
      
      const chartData = await earningService.getEarningsChart(userId, period as 'daily' | 'monthly' | 'yearly', limit);
      sendSuccess(res, 'Chart data retrieved successfully', chartData);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get chart data', error.toString(), 400);
    }
  },

  // GET /api/v1/earnings/transactions
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const transactions = await earningService.getTransactions(userId);
      sendSuccess(res, 'Transactions retrieved successfully', transactions);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get transactions', error.toString(), 400);
    }
  },
};
