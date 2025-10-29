import { body, param, query, ValidationChain } from 'express-validator';

// Auth Validators
export const signupValidator: ValidationChain[] = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
];

export const loginValidator: ValidationChain[] = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Device Validators
export const registerDeviceValidator: ValidationChain[] = [
  body('device_name').notEmpty().withMessage('Device name is required'),
  // All other fields are optional - will use defaults
];

// Session Validators
export const startSessionValidator: ValidationChain[] = [
  body('device_id').isUUID().withMessage('Invalid device ID'),
];

export const stopSessionValidator: ValidationChain[] = [
  body('device_id').isUUID().withMessage('Invalid device ID'),
  body('session_token').optional().isString().withMessage('Invalid session token'),
];

// Task Validators
export const completeTaskValidator: ValidationChain[] = [
  body('taskId').isUUID().withMessage('Invalid task ID'),
  body('result').notEmpty().withMessage('Task result is required'),
];

// Referral Validators
export const verifyReferralValidator: ValidationChain[] = [
  body('referralCode').isLength({ min: 6, max: 10 }).withMessage('Invalid referral code'),
];

// Analytics Validators
export const dateRangeValidator: ValidationChain[] = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];
