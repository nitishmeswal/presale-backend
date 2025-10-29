import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES } from '../utils/constants';
import { Session } from '../types/api';
import logger from '../utils/logger';
import { globalStatsService } from './globalStatsService';

export const sessionService = {
  async startSession(userId: string, deviceId: string): Promise<Session> {
    // Check if device exists and belongs to user
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .eq('owner', userId)
      .single();

    if (!device) {
      throw new Error(ERROR_MESSAGES.DEVICE_NOT_FOUND);
    }

    // Check if device already has an active session
    if (device.session_token && device.status === 'online') {
      throw new Error('Device already has an active session');
    }

    // Generate session token
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Update device with session token (OLD MVP way)
    const { data: updatedDevice, error } = await supabaseAdmin
      .from('devices')
      .update({
        session_token: sessionToken,
        session_created_at: new Date().toISOString(),
        status: 'online',
        last_seen: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .eq('owner', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: updatedDevice.id,
      userId: userId,
      deviceId: deviceId,
      status: 'online',
      sessionToken: sessionToken,
      startTime: updatedDevice.session_created_at,
      tasksCompleted: 0,
      earningsGenerated: 0,
    } as Session;
  },

  // Stop session - from old MVP device-session/stop
  async stopSession(userId: string, deviceId: string, sessionToken?: string): Promise<any> {
    try {
      logger.info(`🛑 Stopping session for device: ${deviceId}, user: ${userId}`);
      
      // Query for the device WITH OWNER CHECK
      const { data: device, error: deviceError } = await supabaseAdmin
        .from('devices')
        .select('*')
        .eq('id', deviceId)
        .eq('owner', userId)  // ✅ VERIFY OWNERSHIP!
        .single();

      if (deviceError || !device) {
        logger.error(`Device not found or not owned by user. Device: ${deviceId}, User: ${userId}`);
        logger.error('Database error:', deviceError);
        throw new Error('Device not found or access denied');
      }

      logger.info(`📊 Current device: status=${device.status}, session_token=${device.session_token ? 'EXISTS' : 'NULL'}, session_created_at=${device.session_created_at}`);

      // Validate the session token if provided
      if (sessionToken && device.session_token !== sessionToken) {
        logger.warn(`⚠️ Invalid session token provided for device ${deviceId}`);
        throw new Error('Invalid session token');
      }

      // Update device status to offline and clear session WITH OWNER CHECK
      const { data: updatedDevice, error: updateError } = await supabaseAdmin
        .from('devices')
        .update({
          status: 'offline',
          session_token: null,
          session_created_at: null,
          last_seen: new Date().toISOString()
        })
        .eq('id', deviceId)
        .eq('owner', userId)  // ✅ VERIFY OWNERSHIP ON UPDATE!
        .select()
        .single();

      if (updateError) {
        logger.error('❌ Failed to update device:', updateError);
        throw new Error(`Failed to stop device session: ${updateError.message}`);
      }

      if (!updatedDevice) {
        logger.error('❌ Update returned no data - device may not exist or wrong owner');
        throw new Error('Failed to update device - no rows affected');
      }

      logger.info(`✅ Session stopped successfully!`);
      logger.info(`📊 Updated device: status=${updatedDevice.status}, session_token=${updatedDevice.session_token}, session_created_at=${updatedDevice.session_created_at}`);

      return {
        message: 'Device session stopped successfully',
        deviceId,
        status: updatedDevice.status,
        session_token: updatedDevice.session_token,
        session_created_at: updatedDevice.session_created_at,
        session_cleared: true
      };
    } catch (error) {
      logger.error('❌ Error stopping device session:', error);
      throw error;
    }
  },

  async getSession(deviceId: string): Promise<Session> {
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (error || !device) {
      throw new Error(ERROR_MESSAGES.SESSION_NOT_FOUND);
    }

    return {
      id: device.id,
      userId: device.owner,
      deviceId: device.id,
      status: device.status,
      sessionToken: device.session_token,
      startTime: device.session_created_at,
      tasksCompleted: 0,
      earningsGenerated: 0,
    } as Session;
  },

  async getUserSessions(userId: string): Promise<Session[]> {
    const { data: devices, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('owner', userId)
      .not('session_token', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return devices.map(device => ({
      id: device.id,
      userId: device.owner,
      deviceId: device.id,
      status: device.status,
      sessionToken: device.session_token,
      startTime: device.session_created_at,
      tasksCompleted: 0,
      earningsGenerated: 0,
    } as Session));
  },

  // Verify session by device (GET method from old MVP)
  async verifySessionByDevice(deviceId: string): Promise<any> {
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('status, session_token, session_created_at')
      .eq('id', deviceId)
      .single();

    if (error) {
      return {
        hasActiveSession: false,
        sessionToken: null,
        sessionCreatedAt: null,
        deviceStatus: 'offline'
      };
    }

    return {
      hasActiveSession: device.status === 'busy' && !!device.session_token,
      sessionToken: device.session_token,
      sessionCreatedAt: device.session_created_at,
      status: device.status
    };
  },

  // Verify session token (POST method from old MVP)
  async verifySessionToken(deviceId: string, sessionToken: string): Promise<boolean> {
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('session_token')
      .eq('id', deviceId)
      .single();

    if (error) {
      return false;
    }

    return device.session_token === sessionToken;
  },

  // Cleanup stale sessions
  async cleanupStaleSessions(): Promise<void> {
    // TODO: Implement cleanup logic for sessions older than X hours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    await supabaseAdmin
      .from('devices')
      .update({
        status: 'offline',
        session_token: null,
        session_created_at: null
      })
      .lt('session_created_at', cutoffTime.toISOString());
  },

  // Sync node uptime (from old MVP)
  async syncNodeUptime(
    userId: string,
    deviceId: string,
    uptimeSeconds: number,
    completedTasks: any
  ): Promise<any> {
    try {
      // Verify the device belongs to the authenticated user
      const { data: deviceData, error: deviceError } = await supabaseAdmin
        .from('devices')
        .select('owner, uptime')
        .eq('id', deviceId)
        .single();

      if (deviceError || !deviceData) {
        throw new Error('Device not found');
      }

      if (deviceData.owner !== userId) {
        throw new Error('Unauthorized access to device');
      }

      // Update device uptime - REPLACE the value (frontend sends REMAINING time)
      // Frontend countdown system: sends remaining seconds, not elapsed
      // DO NOT ADD - just replace with the value sent
      logger.info(`📊 Uptime sync: Current DB=${deviceData.uptime}s, New REMAINING=${uptimeSeconds}s`);
      
      await supabaseAdmin
        .from('devices')
        .update({ 
          uptime: uptimeSeconds,  // ✅ REPLACE, don't add!
          last_seen: new Date().toISOString()
        })
        .eq('id', deviceId);
      
      logger.info(`✅ Uptime updated to: ${uptimeSeconds}s remaining`);

      // Update global stats with completed tasks (with defaults if not provided)
      const tasksData = completedTasks || { three_d: 0, video: 0, text: 0, image: 0 };
      await globalStatsService.updateGlobalStats(tasksData);

      return {
        success: true,
        message: 'Node uptime synced successfully',
        total_uptime: uptimeSeconds,  // Return the new remaining time
        completed_tasks: completedTasks
      };
    } catch (error) {
      logger.error('Error syncing node uptime:', error);
      throw error;
    }
  },

  mapSessionFromDB(dbSession: any): Session {
    return {
      id: dbSession.id,
      userId: dbSession.user_id || dbSession.owner,
      deviceId: dbSession.device_id || dbSession.id,
      status: dbSession.status,
      sessionToken: dbSession.session_token || '',
      startTime: dbSession.start_time || dbSession.session_created_at,
      endTime: dbSession.end_time,
      tasksCompleted: dbSession.tasks_completed || 0,
      earningsGenerated: dbSession.earnings_generated || 0,
    };
  },
};
