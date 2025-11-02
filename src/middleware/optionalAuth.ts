import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

// Optional authentication - doesn't block if token is missing/invalid
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - continue as guest
      req.user = undefined;
      return next();
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      req.user = {
        userId: decoded.userId || decoded.id,
        email: decoded.email
      };
    } catch (jwtError) {
      // Invalid token - continue as guest
      logger.debug('Invalid JWT in optional auth, continuing as guest');
      req.user = undefined;
    }

    next();
  } catch (error) {
    logger.error('Error in optional auth middleware:', error);
    req.user = undefined;
    next();
  }
};
