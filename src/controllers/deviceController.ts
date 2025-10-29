import { Request, Response } from 'express';
import { deviceService } from '../services/deviceService';
import { sendSuccess, sendError } from '../utils/helpers';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import logger from '../utils/logger';

export const deviceController = {
  async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const deviceData = req.body;
      logger.info('🔍 Device Registration - User ID:', userId);
      logger.info('🔍 Device Registration - Request Body:', deviceData);
      const device = await deviceService.registerDevice(userId, deviceData);
      sendSuccess(res, SUCCESS_MESSAGES.DEVICE_REGISTERED, device, 201);
    } catch (error: any) {
      logger.error('❌ Device Registration Error:', error.message);
      logger.error('❌ Full Error:', error);
      sendError(res, error.message || 'Failed to register device', error.toString(), 400);
    }
  },

  async getDevices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'User ID not found', 401);
        return;
      }
      const devices = await deviceService.getDevices(userId);
      sendSuccess(res, 'Devices retrieved successfully', devices);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to get devices', error.toString(), 400);
    }
  },

  async getDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const device = await deviceService.getDevice(deviceId);
      sendSuccess(res, 'Device retrieved successfully', device);
    } catch (error: any) {
      sendError(res, error.message || ERROR_MESSAGES.DEVICE_NOT_FOUND, error.toString(), 404);
    }
  },

  async updateDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const updates = req.body;
      const device = await deviceService.updateDevice(deviceId, updates);
      sendSuccess(res, 'Device updated successfully', device);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to update device', error.toString(), 400);
    }
  },

  async deleteDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      await deviceService.deleteDevice(deviceId);
      sendSuccess(res, 'Device deleted successfully');
    } catch (error: any) {
      sendError(res, error.message || 'Failed to delete device', error.toString(), 400);
    }
  },
};
