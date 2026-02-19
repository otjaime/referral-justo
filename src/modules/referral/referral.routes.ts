import { Router } from 'express';
import { ReferralController } from './referral.controller';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateParams } from '../../middleware/validate';
import { validateCodeParamsSchema, qualifyParamsSchema } from './referral.schema';

const router = Router();
const controller = new ReferralController();

router.get('/my-code', authenticate, asyncHandler(controller.getMyCode));
router.get('/validate/:code', validateParams(validateCodeParamsSchema), asyncHandler(controller.validateCode));
router.post('/:id/qualify', authenticate, requireAdmin, validateParams(qualifyParamsSchema), asyncHandler(controller.qualify));
router.get('/sent', authenticate, asyncHandler(controller.getSent));
router.get('/received', authenticate, asyncHandler(controller.getReceived));

export { router as referralRoutes };
