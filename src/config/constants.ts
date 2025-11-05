import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  API_VERSION: process.env.API_VERSION || 'v1',
  
  // Frontend URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  FRONTEND_PROD_URL: process.env.FRONTEND_PROD_URL || '',
  
  // Additional CORS origins (comma-separated in .env)
  ADDITIONAL_CORS_ORIGINS: process.env.ADDITIONAL_CORS_ORIGINS 
    ? process.env.ADDITIONAL_CORS_ORIGINS.split(',').map(origin => origin.trim())
    : [],
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // JWT
  JWT_SECRET: (process.env.JWT_SECRET || 'your-secret-key') as string,
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '7d') as string,
  
  // Email Service (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Request Body Limit
  REQUEST_BODY_LIMIT: process.env.REQUEST_BODY_LIMIT || '10mb',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/app.log'
};
