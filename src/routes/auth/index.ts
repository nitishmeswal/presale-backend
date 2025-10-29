import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { authLimiter } from '../../middleware/rateLimiter';
import { signupValidator, loginValidator } from '../../utils/validators';

const router = Router();

// Public routes
router.post('/signup', authLimiter, signupValidator, validate, authController.signup);
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// Protected routes
// ⚠️ DEPRECATED - Use /profile routes instead (these are duplicates kept for compatibility)
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

export default router;
