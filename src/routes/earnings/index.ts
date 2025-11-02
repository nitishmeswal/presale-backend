import { Router } from 'express';
import { earningController } from '../../controllers/earningController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All earning routes require authentication
router.use(authenticate);

// GET /api/v1/earnings/stats - Get detailed earnings stats (MUST BE BEFORE '/')
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.json({
        success: false,
        message: 'Unauthorized',
        data: null
      });
    }
    
    const { earningService } = await import('../../services/earningService');
    const stats = await earningService.getDetailedStats(userId);
    
    res.json({
      success: true,
      message: 'Task statistics retrieved successfully',
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stats',
      data: null
    });
  }
});

// GET /api/v1/earnings - Get total earnings
router.get('/', earningController.getTotalEarnings);

// POST /api/v1/claim-rewards - Claim unclaimed rewards (ATOMIC)
router.post('/', earningController.claimEarnings);

// GET /api/v1/earnings/history - Get earning history
router.get('/history', earningController.getEarningHistory);

// GET /api/v1/earnings/leaderboard - Get leaderboard
router.get('/leaderboard', earningController.getLeaderboard);

// GET /api/v1/earnings/chart - Get earnings chart data
router.get('/chart', earningController.getEarningsChart);

// GET /api/v1/earnings/transactions - Get transactions
router.get('/transactions', earningController.getTransactions);

export default router;
