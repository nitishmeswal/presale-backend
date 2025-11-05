import { Router, Request, Response } from 'express';
import { supportController } from '../../controllers/supportController';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { supportLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/support/tickets - Submit support ticket (5/hour limit)
router.post('/tickets', supportLimiter, optionalAuth, supportController.createTicket);

// POST /api/v1/support - Submit support ticket (alternative path, 5/hour limit)
router.post('/', supportLimiter, optionalAuth, supportController.createTicket);

// GET /api/v1/support/tickets - Get user's support tickets (requires auth)
router.get('/tickets', authenticate, supportController.getUserTickets);

// GET /api/v1/support - Get user's support tickets (alternative path)
router.get('/', authenticate, supportController.getUserTickets);

export default router;
