import { Router } from 'express';
import { taskController } from '../../controllers/taskController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// POST /api/v1/complete-task - Complete a task (main endpoint used by frontend)
router.post('/', authenticate, taskController.completeTask);

// GET /api/v1/tasks/stats - Get task completion statistics
router.get('/stats', authenticate, taskController.getTaskStats);

export default router;
