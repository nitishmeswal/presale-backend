import { Router } from 'express';
import { globalStatsController } from '../../controllers/globalStatsController';
import { optionalAuth } from '../../middleware/auth';

const router = Router();

// GET /api/v1/global-stats - Get global statistics (with optional user rank)
router.get('/', optionalAuth, globalStatsController.getGlobalStats);

// GET /api/v1/global-stats/compute - Get user compute stats
router.get('/compute', globalStatsController.getUserComputeStats);

export default router;
