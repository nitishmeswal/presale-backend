import { Router } from 'express';
import { subscriptionController } from '../../controllers/subscriptionController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/subscriptions/current - Get user's current subscription
router.get('/current', subscriptionController.getCurrentSubscription);

export default router;
