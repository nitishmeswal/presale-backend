import app from './app';
import { config } from './config/constants';
import logger from './utils/logger';
import { cronService } from './services/cronService';

const PORT = config.PORT || 3001;

const server = app.listen(PORT, () => {
  const apiUrl = config.NODE_ENV === 'production'
    ? `https://api.neurolov.ai/api/${config.API_VERSION}`
    : `http://localhost:${PORT}/api/${config.API_VERSION}`;
  
  logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  logger.info(`📊 API Base URL: ${apiUrl}`);
  logger.info(`🏥 Health Check: ${config.NODE_ENV === 'production' ? 'https://api.neurolov.ai/health' : `http://localhost:${PORT}/health`}`);
  
  // Start cron jobs
  cronService.startJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections (CRITICAL FOR AWS PRODUCTION)
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't crash in production to maintain uptime
  if (config.NODE_ENV === 'production') {
    logger.error('⚠️ Unhandled promise rejection logged - server continuing');
  }
});

// Handle uncaught exceptions (CRITICAL FOR AWS PRODUCTION)
process.on('uncaughtException', (error: Error) => {
  logger.error('🚨 FATAL: Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  logger.error('Server shutting down gracefully...');
  
  server.close(() => {
    logger.error('Server closed. Process exiting.');
    process.exit(1);
  });
  
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown - graceful close timeout exceeded');
    process.exit(1);
  }, 10000);
});

export default server;
