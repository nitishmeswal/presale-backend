import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/helpers';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const authController = {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, username, referralCode } = req.body;
      const result = await authService.signup(email, password, username, referralCode);
      
      // Set token in cookie
      res.cookie('token', result.token, {
        httpOnly: false, // Allow frontend to read for Authorization header
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
      });
      
      sendSuccess(res, SUCCESS_MESSAGES.USER_CREATED, result, 201);
    } catch (error: any) {
      sendError(res, error.message || 'Signup failed', error.toString(), 400);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      // Set token in cookie
      res.cookie('token', result.token, {
        httpOnly: false, // Allow frontend to read for Authorization header
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
      });
      
      sendSuccess(res, SUCCESS_MESSAGES.LOGIN_SUCCESS, result);
    } catch (error: any) {
      sendError(res, error.message || ERROR_MESSAGES.INVALID_CREDENTIALS, error.toString(), 401);
    }
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const profile = await authService.getProfile(userId);
      sendSuccess(res, 'Profile retrieved successfully', profile);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get profile', error.toString(), 400);
    }
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const updates = req.body;
      const profile = await authService.updateProfile(userId, updates);
      sendSuccess(res, 'Profile updated successfully', profile);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to update profile', error.toString(), 400);
    }
  },

  // PATCH /api/v1/profile - Update task_completed count (from old MVP)
  async updateTaskCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { completed_tasks } = req.body;

      if (!completed_tasks || typeof completed_tasks !== 'object') {
        res.status(400).json({ error: 'completed_tasks object is required' });
        return;
      }

      logger.info('PATCH /api/profile - Received completed_tasks:', completed_tasks);

      // Calculate total tasks completed
      const totalTasks = (completed_tasks.three_d || 0) + 
                        (completed_tasks.video || 0) + 
                        (completed_tasks.text || 0) + 
                        (completed_tasks.image || 0);

      // Add bonus if all task types have at least 1 completed task (from old MVP)
      const allTypesCompleted = completed_tasks.three_d > 0 && 
                               completed_tasks.video > 0 && 
                               completed_tasks.text > 0 && 
                               completed_tasks.image > 0;
      
      const tasksToAdd = allTypesCompleted ? totalTasks + 4 : totalTasks;

      if (tasksToAdd <= 0) {
        res.json({ message: 'No tasks to update', tasks_added: 0 });
        return;
      }

      const result = await authService.updateTaskCount(userId, tasksToAdd);

      res.json({
        message: 'Task completed count updated successfully',
        tasks_added: tasksToAdd,
        bonus_applied: allTypesCompleted,
        new_total: result.task_completed,
        breakdown: {
          base_tasks: totalTasks,
          bonus: allTypesCompleted ? 4 : 0,
          total_added: tasksToAdd
        }
      });
    } catch (error: any) {
      logger.error('Profile PATCH API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
