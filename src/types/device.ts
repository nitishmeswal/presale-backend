export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  gpuModel: string;
  hashRate: number;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'server';
  rewardTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  status: 'offline' | 'online' | 'busy';
  lastSeenAt?: string;
  uptime: number;
  stakeAmount: number;
  performanceScore?: number;
  sessionToken?: string;
  sessionCreatedAt?: string;
  createdAt: string;
}

export interface RegisterDeviceRequest {
  device_name: string;
  gpu_model: string;
  device_type?: 'desktop' | 'laptop' | 'mobile' | 'server';
  hash_rate?: number;
  reward_tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  stake_amount?: number;
  performance_score?: number;
}

export interface UpdateDeviceRequest {
  device_name?: string;
  status?: 'offline' | 'online' | 'busy';
}
