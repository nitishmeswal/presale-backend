import { Router } from 'express';
import { deviceController } from '../../controllers/deviceController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { registerDeviceValidator } from '../../utils/validators';
import { deviceLimiter } from '../../middleware/rateLimiter';

const router = Router();

// All device routes require authentication
router.use(authenticate);

router.post('/', deviceLimiter, registerDeviceValidator, validate, deviceController.registerDevice);
router.get('/', deviceController.getDevices);
router.get('/:deviceId', deviceController.getDevice);
router.put('/:deviceId', deviceController.updateDevice);
router.delete('/:deviceId', deviceController.deleteDevice);

export default router;
