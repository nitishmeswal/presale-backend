import { Router } from 'express';
import { dailyCheckinController } from '../../controllers/dailyCheckinController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/daily-checkins/streak - Get user's current streak
router.get('/streak', dailyCheckinController.getStreak);

// POST /api/v1/daily-checkins - Perform daily check-in
router.post('/', dailyCheckinController.performCheckin);

export default router;
