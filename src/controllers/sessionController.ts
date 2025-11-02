import { Request, Response } from 'express';
import { sessionService } from '../services/sessionService';
import { sendSuccess, sendError } from '../utils/helpers';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const sessionController = {
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      
      const { device_id, force_takeover } = req.body;
      const forceTakeover = force_takeover === true || force_takeover === 'true';
      
      const session = await sessionService.startSession(userId, device_id, forceTakeover);
      sendSuccess(res, SUCCESS_MESSAGES.SESSION_STARTED, session, 201);
    } catch (error: any) {
      // Return session info if active session exists
      if (error.code === 'ACTIVE_SESSION_EXISTS' && error.sessionInfo) {
        res.status(409).json({
          success: false,
          message: error.message,
          error: error.sessionInfo,
          code: 'ACTIVE_SESSION_EXISTS'
        });
        return;
      }
      
      sendError(res, error.message || 'Failed to start session', error.toString(), 400);
    }
  },

  async stopSession(req: Request, res: Response): Promise<void> {
    try {
      // Check authentication
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }

      // Get device_id and session_token from request body
      const { device_id, session_token } = req.body;
      
      if (!device_id) {
        sendError(res, 'device_id is required', 'Missing device_id in request body', 400);
        return;
      }
      
      // Pass userId to verify ownership
      const session = await sessionService.stopSession(userId, device_id, session_token);
      sendSuccess(res, SUCCESS_MESSAGES.SESSION_STOPPED, session);
    } catch (error: any) {
      logger.error('❌ Error in stopSession controller:', error);
      sendError(res, error.message || 'Failed to stop session', error.toString(), 400);
    }
  },

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.getSession(sessionId);
      sendSuccess(res, 'Session retrieved successfully', session);
    } catch (error: any) {
      sendError(res, error.message || ERROR_MESSAGES.SESSION_NOT_FOUND, error.toString(), 404);
    }
  },

  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const sessions = await sessionService.getUserSessions(userId);
      sendSuccess(res, 'Sessions retrieved successfully', sessions);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get sessions', error.toString(), 400);
    }
  },

  // GET /api/v1/device-session/verify - Verify session (from old MVP)
  async verifySessionGet(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.query.deviceId as string;

      if (!deviceId) {
        res.status(400).json({ error: 'Device ID required' });
        return;
      }

      const result = await sessionService.verifySessionByDevice(deviceId);
      res.json(result);
    } catch (error: any) {
      logger.error('Device session verify error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // POST /api/v1/device-session/verify - Verify session ownership (from old MVP)
  async verifySession(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, sessionToken } = req.body;

      if (!deviceId || !sessionToken) {
        res.status(400).json({ error: 'Device ID and session token required' });
        return;
      }

      const isValid = await sessionService.verifySessionToken(deviceId, sessionToken);
      res.json({ isSessionValid: isValid });
    } catch (error: any) {
      logger.error('Session ownership verify error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // POST /api/v1/device-session/cleanup - Cleanup stale sessions
  async cleanupStaleSessions(req: Request, res: Response): Promise<void> {
    try {
      await sessionService.cleanupStaleSessions();
      sendSuccess(res, 'Stale sessions cleaned up successfully');
    } catch (error: any) {
      sendError(res, error.message || 'Failed to cleanup sessions', error.toString(), 500);
    }
  },

  // POST /api/v1/node-uptime - Sync node uptime (from old MVP)
  async syncNodeUptime(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { device_id, uptime_seconds, completed_tasks } = req.body;

      if (!device_id || uptime_seconds === undefined) {
        res.status(400).json({ error: 'Missing required fields: device_id, uptime_seconds' });
        return;
      }

      const result = await sessionService.syncNodeUptime(userId, device_id, uptime_seconds, completed_tasks);
      res.json(result);
    } catch (error: any) {
      logger.error('Node uptime API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
