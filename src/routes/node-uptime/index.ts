import { Router } from 'express';
import { sessionController } from '../../controllers/sessionController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// POST /api/v1/node-uptime - Sync node uptime
router.post('/', authenticate, sessionController.syncNodeUptime);

export default router;
