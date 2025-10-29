import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES } from '../utils/constants';
import { Device, RegisterDeviceRequest, UpdateDeviceRequest } from '../types/device';

export const deviceService = {
  async registerDevice(
    userId: string,
    deviceData: any
  ): Promise<Device> {
    // Extract GPU info from various possible field names
    const gpuModel = deviceData.gpu_model || 
      deviceData.gpu || 
      deviceData.gpu_info || 
      'Unknown GPU';
    
    // Map device_type if provided (frontend sends 'Mobile', 'Desktop', etc.)
    const deviceType = deviceData.device_type?.toLowerCase() || 'desktop';
    
    const { data: device, error} = await supabaseAdmin
      .from('devices')
      .insert({
        owner: userId,
        device_name: deviceData.device_name,
        gpu_model: gpuModel,
        hash_rate: deviceData.hash_rate || deviceData.gpu_cores || 0,
        device_type: deviceType,
        reward_tier: deviceData.reward_tier || null,
        status: 'offline',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register device: ${error.message}`);
    }

    return this.mapDeviceFromDB(device);
  },
  
  // Helper to map device_type to hardware_tier
  mapDeviceTypeToTier(deviceType?: string): string | null {
    if (!deviceType) return null;
    
    const mapping: { [key: string]: string } = {
      'desktop': 'webgpu',
      'laptop': 'webgl',
      'mobile': 'webgl',
      'tablet': 'webgl',
      'server': 'webgpu',
    };
    
    return mapping[deviceType.toLowerCase()] || 'cpu';
  },

  async getDevices(userId: string): Promise<Device[]> {
    const { data: devices, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('owner', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return devices.map(this.mapDeviceFromDB);
  },

  async getDevice(deviceId: string): Promise<Device> {
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (error || !device) {
      throw new Error(ERROR_MESSAGES.DEVICE_NOT_FOUND);
    }

    return this.mapDeviceFromDB(device);
  },

  async updateDevice(
    deviceId: string,
    updates: UpdateDeviceRequest
  ): Promise<Device> {
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .update({
        device_name: updates.device_name,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapDeviceFromDB(device);
  },

  async deleteDevice(deviceId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('devices')
      .delete()
      .eq('id', deviceId);

    if (error) {
      throw new Error(error.message);
    }
  },

  mapDeviceFromDB(dbDevice: any): Device {
    return {
      id: dbDevice.id,
      userId: dbDevice.owner,
      deviceName: dbDevice.device_name,
      gpuModel: dbDevice.gpu_model,
      hashRate: dbDevice.hash_rate,
      deviceType: dbDevice.device_type,
      rewardTier: dbDevice.reward_tier,
      status: dbDevice.status,
      lastSeenAt: dbDevice.last_seen,
      uptime: dbDevice.uptime,
      stakeAmount: dbDevice.stake_amount,
      performanceScore: dbDevice.performance_score,
      sessionToken: dbDevice.session_token,
      sessionCreatedAt: dbDevice.session_created_at,
      createdAt: dbDevice.created_at,
    };
  },
};
