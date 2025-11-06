// Device Types
export enum DeviceType {
  DESKTOP = 'desktop',
  LAPTOP = 'laptop',
  SERVER = 'server'
}

// Session Status
export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  FAILED = 'failed'
}

// Task Status
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Task Types
export enum TaskType {
  TRAINING = 'training',
  INFERENCE = 'inference',
  VALIDATION = 'validation'
}

// Earning Status
export enum EarningStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CLAIMED = 'claimed'
}

// User Roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'User already exists',
  USER_NOT_FOUND: 'User not found',
  DEVICE_NOT_FOUND: 'Device not found',
  SESSION_NOT_FOUND: 'Session not found',
  TASK_NOT_FOUND: 'Task not found',
  INVALID_TOKEN: 'Invalid or expired token',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  REFERRAL_NOT_FOUND: 'Referral code not found',
  REFERRAL_ALREADY_USED: 'Referral code already used',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  DEVICE_REGISTERED: 'Device registered successfully',
  SESSION_STARTED: 'Session started successfully',
  SESSION_STOPPED: 'Session stopped successfully',
  TASK_COMPLETED: 'Task completed successfully',
  EARNINGS_CLAIMED: 'Earnings claimed successfully',
  REFERRAL_APPLIED: 'Referral code applied successfully',
};

// Rate Per Hour (in tokens)
export const EARNINGS_CONFIG = {
  BASE_RATE_PER_HOUR: 10,
  TRAINING_MULTIPLIER: 1.5,
  INFERENCE_MULTIPLIER: 1.0,
  VALIDATION_MULTIPLIER: 1.2,
  
  // Referral Signup Bonuses
  REFERRER_SIGNUP_BONUS: 250,  // Person who refers gets 250 SP
  REFERRED_SIGNUP_BONUS: 500,  // Person who is referred gets 500 SP
  
  // Tiered Royalty Percentages
  TIER_1_PERCENTAGE: 0.10,  // 10% from direct referrals
  TIER_2_PERCENTAGE: 0.05,  // 5% from tier 1's referrals
  TIER_3_PERCENTAGE: 0.025, // 2.5% from tier 2's referrals
};
