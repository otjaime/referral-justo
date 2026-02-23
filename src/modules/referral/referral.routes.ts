import { Router } from 'express';
import { ReferralController } from './referral.controller';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validate, validateParams } from '../../middleware/validate';
import {
  validateCodeParamsSchema,
  qualifyParamsSchema,
  scoreParamsSchema,
  pipelineParamsSchema,
  pipelineUpdateSchema,
  timelineParamsSchema,
} from './referral.schema';

const router = Router();
const controller = new ReferralController();

router.get('/my-code', authenticate, asyncHandler(controller.getMyCode));
router.get('/admin/all', authenticate, requireAdmin, asyncHandler(controller.getAll));
router.get('/validate/:code', validateParams(validateCodeParamsSchema), asyncHandler(controller.validateCode));
router.post('/:id/qualify', authenticate, requireAdmin, validateParams(qualifyParamsSchema), asyncHandler(controller.qualify));
router.get('/sent', authenticate, asyncHandler(controller.getSent));
router.get('/received', authenticate, asyncHandler(controller.getReceived));

// Phase 3: Scoring (accessible to auth users to see their own post-registration score)
router.get('/:id/score', authenticate, validateParams(scoreParamsSchema), asyncHandler(controller.getScore));

// Phase 4: Pipeline & Timeline
router.patch('/:id/pipeline', authenticate, requireAdmin, validateParams(pipelineParamsSchema), validate(pipelineUpdateSchema), asyncHandler(controller.updatePipeline));
router.get('/:id/timeline', authenticate, requireAdmin, validateParams(timelineParamsSchema), asyncHandler(controller.getTimeline));

export { router as referralRoutes };
