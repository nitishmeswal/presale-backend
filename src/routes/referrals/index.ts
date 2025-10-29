import { Router, Request, Response } from 'express';
import { referralService } from '../../services/referralService';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { verifyReferralValidator } from '../../utils/validators';
import { sendSuccess, sendError } from '../../utils/helpers';

const router = Router();

// Verify referral code (public)
router.post('/verify', verifyReferralValidator, validate, async (req: Request, res: Response) => {
  try {
    const { referralCode } = req.body;
    const result = await referralService.verifyReferralCode(referralCode);
    sendSuccess(res, 'Referral code verified', result);
  } catch (error: any) {
    sendError(res, 'Failed to verify referral code', error.message, 400);
  }
});

// Protected routes
router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const referrals = await referralService.getReferrals(userId);
    sendSuccess(res, 'Referrals retrieved successfully', referrals);
  } catch (error: any) {
    sendError(res, 'Failed to get referrals', error.message, 400);
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const stats = await referralService.getReferralStats(userId);
    sendSuccess(res, 'Referral stats retrieved successfully', stats);
  } catch (error: any) {
    sendError(res, 'Failed to get referral stats', error.message, 400);
  }
});

export default router;
