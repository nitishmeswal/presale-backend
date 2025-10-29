export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  status: 'online' | 'offline' | 'busy';
  sessionToken: string;
  startTime: string;
  endTime?: string;
  tasksCompleted: number;
  earningsGenerated: number;
}

export interface Earning {
  id: string;
  userId: string;
  sessionId?: string;
  taskId?: string;
  amount: number;
  type: 'task' | 'referral' | 'bonus';
  status: 'pending' | 'confirmed' | 'claimed';
  description?: string;
  createdAt: string;
  claimedAt?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId?: string;
  referralCode: string;
  status: 'pending' | 'active' | 'completed';
  rewardAmount: number;
  createdAt: string;
  usedAt?: string;
}
