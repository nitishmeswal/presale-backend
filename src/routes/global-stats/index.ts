import { Router } from 'express';
import { globalStatsService } from '../../services/globalStatsService';

const router = Router();

// GET /api/v1/global-stats - Get global statistics
router.get('/', async (req, res) => {
  try {
    const stats = await globalStatsService.getGlobalStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/global-stats/compute - Get user compute stats
router.get('/compute', async (req, res) => {
  try {
    const stats = await globalStatsService.getUserComputeStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
