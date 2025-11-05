import { Router } from 'express';
import { settingsController } from '../../controllers/settingsController';
import { authenticate } from '../../middleware/auth';
import { settingsLimiter, deletionLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All settings routes require authentication

// DELETE /api/v1/settings/account - Delete user account (STRICT 1/hour limit)
router.delete('/account', deletionLimiter, authenticate, settingsController.deleteAccount);

// PUT /api/v1/settings/password - Change password (5/hour limit)
router.put('/password', settingsLimiter, authenticate, settingsController.changePassword);

// PUT /api/v1/settings/profile - Update profile settings (5/hour limit)
router.put('/profile', settingsLimiter, authenticate, settingsController.updateSettings);

export default router;
