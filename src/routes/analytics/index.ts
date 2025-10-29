import { Router } from 'express';
import { analyticsController } from '../../controllers/analyticsController';
import { authenticate, optionalAuth } from '../../middleware/auth';

const router = Router();

// Dashboard requires authentication
router.get('/dashboard', authenticate, analyticsController.getDashboard);

// Global stats can be public or authenticated
router.get('/global', optionalAuth, analyticsController.getGlobalStats);

// ⚠️ DEPRECATED - Use /earnings/leaderboard instead (kept for compatibility)
router.get('/leaderboard', optionalAuth, analyticsController.getLeaderboard);

export default router;
