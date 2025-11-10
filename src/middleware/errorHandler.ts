import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle AppError instances
  if (err instanceof AppError) {
    logger.error({
      message: err.message,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      requestId: (req as any).id,
      url: req.originalUrl,
      method: req.method,
      userId: (req as any).userId,
    });

    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle unexpected errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    message: err.message,
    statusCode,
    stack: err.stack,
    requestId: (req as any).id,
    url: req.originalUrl,
    method: req.method,
    userId: (req as any).userId,
  });

  // Never expose internal error details in production
  const responseMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : message;

  res.status(statusCode).json({
    success: false,
    error: {
      message: responseMessage,
      code: 'INTERNAL_ERROR',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    }
  });
};
