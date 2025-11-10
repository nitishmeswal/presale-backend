import { Router, Request, Response } from 'express';
import { testDatabaseConnection } from '../config/database';
import logger from '../utils/logger';

const router = Router();

/**
 * Enhanced Health Check Endpoint
 * Used by load balancers and monitoring systems
 */
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbHealthy = await testDatabaseConnection();
    
    const responseTime = Date.now() - startTime;
    
    // Return 503 if any service is down
    if (!dbHealthy) {
      return res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
        },
        responseTime: `${responseTime}ms`
      });
    }
    
    // All systems healthy
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'healthy',
      },
      responseTime: `${responseTime}ms`,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error(`Health check failed: ${(error as Error).message}`);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * Readiness probe - checks if app is ready to receive traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await testDatabaseConnection();
    
    if (dbHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * Liveness probe - checks if app is alive (for Kubernetes)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;
