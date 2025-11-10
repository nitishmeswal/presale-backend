import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

/**
 * Request ID Middleware
 * Adds unique ID to each request for tracing
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate or use existing request ID from header
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Attach to request object
  (req as any).id = requestId;
  
  // Add to response headers for client tracking
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start (optional - can be disabled for less noise)
  // logger.info(`[${requestId}] ${req.method} ${req.originalUrl}`);
  
  // Log response when finished
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Only log if slow (>1s) or error status
    if (duration > 1000 || res.statusCode >= 400) {
      logger.info(`[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
};
