import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/auth';
import { sendError } from '../utils/helpers';
import { ERROR_MESSAGES } from '../utils/constants';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'No token provided', 401);
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      sendError(res, ERROR_MESSAGES.INVALID_TOKEN, 'Token verification failed', 401);
      return;
    }
  } catch (error) {
    sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 'Authentication failed', 401);
    return;
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token invalid but continue without user
      }
    }
    next();
  } catch (error) {
    next();
  }
};
