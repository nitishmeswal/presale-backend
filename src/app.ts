import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config/constants';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import logger from './utils/logger';
import routes from './routes';
import healthRoutes from './routes/health';

const app: Application = express();

// Trust proxy (important for AWS deployment)
app.set('trust proxy', 1);

// Request ID tracking (must be first)
app.use(requestIdMiddleware);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - All origins from environment variables
const allowedOrigins = [
  config.FRONTEND_URL,
  config.FRONTEND_PROD_URL,
  ...config.ADDITIONAL_CORS_ORIGINS
].filter(origin => origin && origin.length > 0); // Remove empty strings

logger.info(`🔒 CORS enabled for origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing - Configurable body limit
app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: config.REQUEST_BODY_LIMIT }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Rate limiting
app.use(rateLimiter);

// Health check endpoints (no auth required, no rate limiting)
app.use(healthRoutes);

// API routes
app.use('/api/v1', routes);

// 404 handler - Express 5 compatible (no wildcard needed)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

export default app;
