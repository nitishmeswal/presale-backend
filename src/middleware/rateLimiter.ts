import rateLimit from 'express-rate-limit';
import { config } from '../config/constants';

// No custom keyGenerator needed - use default for IP-based limiting
// For user-specific limits, we'll handle it in middleware

export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default IP-based key generator (handles IPv6 correctly)
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    timestamp: new Date().toISOString()
  },
  skipSuccessfulRequests: true,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    message: 'API rate limit exceeded, please slow down.',
    timestamp: new Date().toISOString()
  },
});

// Settings endpoints rate limiter (CRITICAL SECURITY)
export const settingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 settings changes per hour
  message: {
    success: false,
    message: 'Too many settings changes, please try again later.',
    timestamp: new Date().toISOString()
  },
  // Note: Using IP-based limiting (express-rate-limit default)
  // For true per-user limiting, would need Redis store with userId as key
});

// Account deletion rate limiter (STRICT)
export const deletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // Only 1 deletion attempt per hour
  message: {
    success: false,
    message: 'Account deletion can only be attempted once per hour.',
    timestamp: new Date().toISOString()
  },
});

// Support ticket rate limiter
export const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 tickets per hour
  message: {
    success: false,
    message: 'Too many support requests, please try again later.',
    timestamp: new Date().toISOString()
  },
});

// Device registration rate limiter
export const deviceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 device registrations per hour
  message: {
    success: false,
    message: 'Too many device registrations, please slow down.',
    timestamp: new Date().toISOString()
  },
});

// Earnings claim rate limiter
export const claimLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 100 claims per day
  message: {
    success: false,
    message: 'Daily claim limit reached. Please try again tomorrow.',
    timestamp: new Date().toISOString()
  },
});
