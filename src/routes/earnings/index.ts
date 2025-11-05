import { Router, Request, Response } from 'express';
import { earningController } from '../../controllers/earningController';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/helpers';
import { claimLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All earning routes require authentication
router.use(authenticate);

// GET /api/v1/earnings/stats - Get detailed earnings stats (MUST BE BEFORE '/')
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      sendError(res, 'Unauthorized', 'User not authenticated', 401);
      return;
    }

    const { data, error } = await (await import('../../config/database')).supabaseAdmin
      .from('earnings')
      .select('amount, earning_type, created_at, reward_type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    sendSuccess(res, 'Earnings stats retrieved successfully', {
      earnings: data || [],
      total: data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    });
  } catch (error: any) {
    sendError(res, 'Failed to get earnings stats', error.message, 500);
  }
});

// GET /api/v1/earnings - Get total earnings
router.get('/', earningController.getTotalEarnings);

// POST /api/v1/claim-rewards - Claim unclaimed rewards (100/day limit)
router.post('/', claimLimiter, earningController.claimEarnings);

// GET /api/v1/earnings/history - Get earning history
router.get('/history', earningController.getEarningHistory);

// GET /api/v1/earnings/leaderboard - Get leaderboard
router.get('/leaderboard', earningController.getLeaderboard);

// GET /api/v1/earnings/chart - Get earnings chart data
router.get('/chart', earningController.getEarningsChart);

// GET /api/v1/earnings/transactions - Get transactions
router.get('/transactions', earningController.getTransactions);

export default router;
