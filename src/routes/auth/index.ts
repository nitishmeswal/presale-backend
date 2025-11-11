import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { passwordResetController } from '../../controllers/passwordResetController';
import { googleAuthController } from '../../controllers/googleAuthController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { authLimiter } from '../../middleware/rateLimiter';
import { signupValidator, loginValidator } from '../../utils/validators';

const router = Router();

// Public routes
router.post('/signup', authLimiter, signupValidator, validate, authController.signup);
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// Google OAuth routes
router.get('/google', authLimiter, googleAuthController.getGoogleAuthUrl);
router.post('/google/callback', authLimiter, googleAuthController.handleGoogleCallback);
router.post('/google', authLimiter, googleAuthController.googleLogin); // Legacy support

// Password reset routes (public) - multiple paths for frontend compatibility
router.post('/forgot-password', authLimiter, passwordResetController.sendResetOTP);
router.post('/reset-password', authLimiter, passwordResetController.resetPassword);
router.post('/resend-otp', authLimiter, passwordResetController.resendOTP);

// Alternative routes with underscores (frontend uses these)
router.post('/reset_password/send-otp', authLimiter, passwordResetController.sendResetOTP);
router.post('/reset_password/verify-otp', authLimiter, passwordResetController.resetPassword);
router.post('/reset_password/resend-otp', authLimiter, passwordResetController.resendOTP);

// Alternative routes with hyphens (frontend compatibility)
router.post('/reset-password/send-otp', authLimiter, passwordResetController.sendResetOTP);
router.post('/reset-password/verify-otp', authLimiter, passwordResetController.resetPassword);
router.post('/reset-password/resend-otp', authLimiter, passwordResetController.resendOTP);

// NEW: Two-step password reset routes
router.post('/verify-otp', authLimiter, passwordResetController.verifyOTP);
router.post('/set-new-password', authLimiter, passwordResetController.setNewPassword);

// Protected routes
// ⚠️ DEPRECATED - Use /profile routes instead (these are duplicates kept for compatibility)
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

export default router;
