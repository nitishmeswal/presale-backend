import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscriptionService';
import { sendSuccess, sendError } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const subscriptionController = {
  // GET /api/v1/subscriptions/current - Get user's current subscription
  async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      const subscription = await subscriptionService.getCurrentSubscription(userId);
      sendSuccess(res, 'Subscription retrieved successfully', subscription);
    } catch (error: any) {
      logger.error('Exception in GET /subscriptions/current:', error);
      sendError(res, error.message || 'Failed to get subscription', error.toString(), 500);
    }
  }
};
