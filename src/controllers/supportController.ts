import { Request, Response } from 'express';
import { supportService } from '../services/supportService';
import { sendSuccess, sendError } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const supportController = {
  // POST /api/v1/support/tickets - Submit support ticket
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || null; // Optional - can work for guests too

      const { name, email, message } = req.body;

      logger.info(`📧 Support ticket request: name=${name}, email=${email}, userId=${userId || 'guest'}`);

      // Validation
      if (!name || !email || !message) {
        logger.warn('❌ Validation failed: missing fields');
        sendError(res, 'Validation failed', 'Name, email, and message are required', 400);
        return;
      }

      if (message.length < 10) {
        logger.warn('❌ Validation failed: message too short');
        sendError(res, 'Message must be at least 10 characters', 'Please provide more details in your message', 400);
        return;
      }

      const ticket = await supportService.createTicket(userId, name, email, message);
      logger.info(`✅ Support ticket created: ${ticket.id}`);
      sendSuccess(res, 'Support ticket submitted successfully. Our team will respond within 24 hours.', ticket);
    } catch (error: any) {
      logger.error('❌ Exception in POST /support/tickets:', error);
      sendError(res, error.message || 'Failed to submit support ticket', error.toString(), 500);
    }
  },

  // GET /api/v1/support - Get user's tickets
  async getUserTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      const tickets = await supportService.getUserTickets(userId);
      sendSuccess(res, 'Support tickets retrieved successfully', tickets);
    } catch (error: any) {
      logger.error('Exception in GET /support:', error);
      sendError(res, error.message || 'Failed to get support tickets', error.toString(), 500);
    }
  }
};
