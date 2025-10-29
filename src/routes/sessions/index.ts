import { Router } from 'express';
import { sessionController } from '../../controllers/sessionController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { startSessionValidator, stopSessionValidator } from '../../utils/validators';

const router = Router();

// All session routes require authentication
router.use(authenticate);

// POST /api/v1/device-session/register - Start/register a device session
router.post('/register', startSessionValidator, validate, sessionController.startSession);

// POST /api/v1/device-session/stop - Stop device session (no validator - accepts any body)
router.post('/stop', sessionController.stopSession);

// GET & POST /api/v1/device-session/verify - Verify active session
router.get('/verify', sessionController.verifySessionGet);
router.post('/verify', sessionController.verifySession);

// POST /api/v1/device-session/cleanup - Cleanup stale sessions
router.post('/cleanup', sessionController.cleanupStaleSessions);

export default router;
