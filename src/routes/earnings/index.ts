import { Router } from 'express';
import { earningController } from '../../controllers/earningController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All earning routes require authentication
router.use(authenticate);

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
