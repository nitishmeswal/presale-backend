import { Router } from 'express';
import { globalStatsService } from '../../services/globalStatsService';

const router = Router();

// POST /api/v1/update-device-uptime - Update device uptime and task stats
router.post('/', async (req, res) => {
  try {
    const { device_id, uptime_seconds, completed_tasks } = req.body;

    // Validate required fields
    if (!device_id || uptime_seconds === undefined || !completed_tasks) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: device_id, uptime_seconds, and completed_tasks are required'
      });
    }

    // Validate uptime_seconds is a positive number
    if (typeof uptime_seconds !== 'number' || uptime_seconds < 0) {
      return res.status(400).json({
        success: false,
        error: 'uptime_seconds must be a positive number'
      });
    }

    // Validate completed_tasks structure
    const { three_d, video, text, image } = completed_tasks;
    if (
      typeof three_d !== 'number' || three_d < 0 ||
      typeof video !== 'number' || video < 0 ||
      typeof text !== 'number' || text < 0 ||
      typeof image !== 'number' || image < 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'All completed_tasks values must be non-negative numbers'
      });
    }

    const result = await globalStatsService.updateDeviceUptime(
      device_id,
      uptime_seconds,
      completed_tasks
    );

    res.json({
      success: true,
      message: 'Device uptime and global statistics updated successfully',
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;
