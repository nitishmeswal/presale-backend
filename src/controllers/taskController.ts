import { Request, Response } from 'express';
import { taskService } from '../services/taskService';
import { sendSuccess, sendError } from '../utils/helpers';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const taskController = {
  // POST /api/v1/complete-task - Main endpoint from old MVP
  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      const {
        increment_amount,
        reward_amount,  // Frontend sends this
        task_id,
        task_type,
        hardware_tier,
        multiplier
      } = req.body;

      // Accept both increment_amount (old) and reward_amount (new frontend)
      const rewardAmount = increment_amount || reward_amount;

      // SECURITY: Validate task completion amount (from old MVP)
      if (typeof rewardAmount !== 'number' || rewardAmount < 0 || !Number.isInteger(rewardAmount)) {
        sendError(res, 'Invalid task reward amount. Must be a positive integer.', '', 400);
        return;
      }

      // SECURITY: Block exploitation - max 100 SP per task (from old MVP)
      if (rewardAmount > 100) {
        logger.warn('🚨 SECURITY ALERT: Suspicious task completion SP attempt', {
          userId,
          attemptedAmount: rewardAmount,
          taskId: task_id,
          taskType: task_type,
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent']
        });
        
        sendError(res, 'Invalid task reward amount. Maximum 100 SP per single task completion.', '', 400);
        return;
      }

      // Call service to complete task and update unclaimed rewards
      const result = await taskService.completeTaskWithRewards(
        userId,
        rewardAmount,  // Use the normalized field name
        task_id,
        task_type,
        hardware_tier,
        multiplier
      );

      sendSuccess(res, SUCCESS_MESSAGES.TASK_COMPLETED, result);
    } catch (error: any) {
      logger.error('Exception in POST /api/complete-task:', error);
      sendError(res, error.message || 'Failed to complete task', error.toString(), 500);
    }
  },

  // GET /api/v1/tasks/stats - Get task completion statistics
  async getTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      const stats = await taskService.getTaskStats(userId);
      sendSuccess(res, 'Task statistics retrieved successfully', stats);
    } catch (error: any) {
      logger.error('Exception in GET /tasks/stats:', error);
      sendError(res, error.message || 'Failed to get task stats', error.toString(), 500);
    }
  },
};
