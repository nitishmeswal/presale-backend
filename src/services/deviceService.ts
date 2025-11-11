import { supabaseAdmin } from '../config/database';
import { ERROR_MESSAGES } from '../utils/constants';
import { Device, RegisterDeviceRequest, UpdateDeviceRequest } from '../types/device';
import logger from '../utils/logger';

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
    
    // PRIORITY: Use frontend's GPU detection if provided
    // Frontend has more sophisticated detection (WebGL, navigator.gpu, etc.)
    // Backend calculation is only a fallback for when frontend doesn't send it
    
    // Accept BOTH field names: reward_tier (snake_case) OR hardware_tier (what frontend actually sends)
    const frontendTier = deviceData.reward_tier || deviceData.hardware_tier || deviceData.hardwareTier;
    
    let rewardTier: string;
    if (frontendTier && ['webgpu', 'wasm', 'webgl', 'cpu'].includes(frontendTier)) {
      rewardTier = frontendTier;
      logger.info(`✅ Using frontend-detected tier: ${rewardTier} for GPU: ${gpuModel}`);
    } else {
      rewardTier = this.calculateRewardTier(gpuModel, deviceType, deviceData.hash_rate);
      logger.info(`⚠️ Frontend tier not provided/invalid (got: ${frontendTier}), backend calculated: ${rewardTier}`);
    }
    
    // Get user's plan to set correct uptime
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('plan')
      .eq('id', userId)
      .single();
    
    const plan = (userProfile?.plan || 'free').toLowerCase();
    const uptimeLimits: { [key: string]: number } = {
      free: 14400,         // 4 hours
      basic: 36000,        // 10 hours
      ultimate: 64800,     // 18 hours
      enterprise: 86400    // 24 hours
    };
    const initialUptime = uptimeLimits[plan] || 14400;
    
    logger.info(`📊 Setting device uptime to ${initialUptime}s for ${plan} plan`);
    
    const { data: device, error} = await supabaseAdmin
      .from('devices')
      .insert({
        owner: userId,
        device_name: deviceData.device_name,
        gpu_model: gpuModel,
        hash_rate: deviceData.hash_rate || deviceData.gpu_cores || 0,
        device_type: deviceType,
        reward_tier: rewardTier,
        status: 'offline',
        uptime: initialUptime
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register device: ${error.message}`);
    }

    return this.mapDeviceFromDB(device);
  },

  // Calculate reward tier based on device specs
  calculateRewardTier(gpuModel: string, deviceType: string, hashRate?: number): 'webgpu' | 'wasm' | 'webgl' | 'cpu' {
    // Handle null/undefined GPU model
    if (!gpuModel || typeof gpuModel !== 'string') {
      return 'cpu';  // Default for unknown GPU
    }

    // High-end GPUs → webgpu
    const webgpuGPUs = ['RTX 4090', 'RTX 4080', 'RTX 3090', 'RTX 3080 Ti', 'RTX 3080', 'A100', 'H100'];
    // Mid-high GPUs → wasm
    const wasmGPUs = ['RTX 4070', 'RTX 3070 Ti', 'RTX 3070', 'RTX 2080 Ti', 'RTX 2080 SUPER', 'RTX 2080'];
    // Mid-low GPUs → webgl
    const webglGPUs = ['RTX 4060', 'RTX 3060 Ti', 'RTX 3060', 'RTX 2070', 'RTX 2060', 'GTX 1660', 'GTX 1650'];
    
    const gpuUpper = gpuModel.toUpperCase();
    
    // Check webgpu tier (highest)
    if (webgpuGPUs.some(gpu => gpuUpper.includes(gpu.toUpperCase()))) {
      return 'webgpu';
    }
    
    // Check wasm tier (high)
    if (wasmGPUs.some(gpu => gpuUpper.includes(gpu.toUpperCase()))) {
      return 'wasm';
    }
    
    // Check webgl tier (mid)
    if (webglGPUs.some(gpu => gpuUpper.includes(gpu.toUpperCase()))) {
      return 'webgl';
    }
    
    // Check by hash rate if available
    if (hashRate) {
      if (hashRate > 10000) return 'webgpu';
      if (hashRate > 5000) return 'wasm';
      if (hashRate > 2000) return 'webgl';
    }
    
    // Default to cpu for lower-end GPUs or unknown
    return 'cpu';
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

  // Update device uptime when user upgrades plan
  async updateDeviceUptimeForPlanUpgrade(userId: string, newPlan: string): Promise<void> {
    try {
      // Get new plan's uptime limit
      const planLimits: { [key: string]: number } = {
        free: 14400,         // 4 hours
        basic: 36000,        // 10 hours
        ultimate: 64800,     // 18 hours
        enterprise: 86400,   // 24 hours
        // Legacy support
        elite: 86400,        // Maps to enterprise
        pro: 64800          // Maps to ultimate
      };
      
      const newUptimeLimit = planLimits[newPlan.toLowerCase()] || 14400;
      
      logger.info(`🔄 Plan upgrade: Resetting all devices for user ${userId} to ${newUptimeLimit}s (${newPlan} plan)`);
      
      // Update ALL devices for this user to new plan's full uptime
      const { error } = await supabaseAdmin
        .from('devices')
        .update({ 
          uptime: newUptimeLimit,
          updated_at: new Date().toISOString()
        })
        .eq('owner', userId);
      
      if (error) {
        throw new Error(`Failed to update device uptime for plan upgrade: ${error.message}`);
      }
      
      logger.info(`✅ Plan upgrade complete: All devices reset to ${newUptimeLimit}s uptime`);
    } catch (error: any) {
      logger.error(`Error updating device uptime for plan upgrade: ${error.message || JSON.stringify(error)}`);
      throw error;
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
