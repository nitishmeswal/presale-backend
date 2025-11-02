import { Router } from 'express';
import { supportController } from '../../controllers/supportController';
import { authenticate } from '../../middleware/auth';
import { optionalAuth } from '../../middleware/optionalAuth';

const router = Router();

// POST /api/v1/support/tickets - Submit support ticket (works for guests too)
router.post('/tickets', optionalAuth, supportController.createTicket);

// POST /api/v1/support - Submit support ticket (alternative path)
router.post('/', optionalAuth, supportController.createTicket);

// GET /api/v1/support/tickets - Get user's support tickets (requires auth)
router.get('/tickets', authenticate, supportController.getUserTickets);

// GET /api/v1/support - Get user's support tickets (alternative path)
router.get('/', authenticate, supportController.getUserTickets);

export default router;
