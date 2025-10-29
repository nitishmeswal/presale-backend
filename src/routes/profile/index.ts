import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// GET /api/v1/profile - Get user profile
router.get('/', authController.getProfile);

// PUT /api/v1/profile - Update user profile  
router.put('/', authController.updateProfile);

// PATCH /api/v1/profile - Update task completed count
router.patch('/', authController.updateTaskCount);

export default router;
