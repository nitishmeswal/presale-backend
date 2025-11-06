import { Router, Request, Response } from 'express';
import { referralService } from '../../services/referralService';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { verifyReferralValidator } from '../../utils/validators';
import { sendSuccess, sendError } from '../../utils/helpers';

const router = Router();

// Verify referral code - GET with URL param (primary)
router.get('/verify/:code', async (req: Request, res: Response) => {
  try {
    const referralCode = req.params.code;
    
    if (!referralCode || referralCode.length < 6 || referralCode.length > 10) {
      return sendError(res, 'Invalid referral code', 'Code must be 6-10 characters', 400);
    }
    
    const result = await referralService.verifyReferralCode(referralCode);
    sendSuccess(res, 'Referral code verified', result);
  } catch (error: any) {
    sendError(res, 'Failed to verify referral code', error.message, 400);
  }
});

// Verify referral code - POST with body (alternative)
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const referralCode = req.body.referralCode;
    
    if (!referralCode || referralCode.length < 6 || referralCode.length > 10) {
      return sendError(res, 'Invalid referral code', 'Code must be 6-10 characters', 400);
    }
    
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

// Get detailed referral breakdown (only Tier 1 names shown)
router.get('/breakdown', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const breakdown = await referralService.getReferralBreakdown(userId);
    sendSuccess(res, 'Referral breakdown retrieved successfully', breakdown);
  } catch (error: any) {
    sendError(res, 'Failed to get referral breakdown', error.message, 400);
  }
});

// Claim pending referral rewards
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const result = await referralService.claimReferralRewards(userId);
    sendSuccess(res, result.message, result);
  } catch (error: any) {
    sendError(res, 'Failed to claim referral rewards', error.message, 400);
  }
});

export default router;
