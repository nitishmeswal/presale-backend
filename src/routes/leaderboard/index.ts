import { Router } from 'express';
import { leaderboardController } from '../../controllers/leaderboardController';
import { optionalAuth, authenticate } from '../../middleware/auth';

const router = Router();

// GET /api/v1/leaderboard - Get top 10 + current user's rank (if authenticated)
router.get('/', optionalAuth, leaderboardController.getLeaderboard);

// GET /api/v1/leaderboard/rank - Get current user's rank (authenticated only)
router.get('/rank', authenticate, leaderboardController.getUserRank);

export default router;
