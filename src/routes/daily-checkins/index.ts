import { Router } from 'express';
import { dailyCheckinController } from '../../controllers/dailyCheckinController';
import { authenticate } from '../../middleware/auth';
import { checkinGetLimiter, checkinPostLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/daily-checkins/streak - Get user's current streak
router.get('/streak', checkinGetLimiter, dailyCheckinController.getStreak);

// POST /api/v1/daily-checkins - Perform daily check-in
router.post('/', checkinPostLimiter, dailyCheckinController.performCheckin);

export default router;
