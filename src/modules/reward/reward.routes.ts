import { Router } from 'express';
import { RewardController } from './reward.controller';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateParams } from '../../middleware/validate';
import { redeemParamsSchema } from './reward.schema';

const router = Router();
const controller = new RewardController();

router.get('/', authenticate, asyncHandler(controller.getMyRewards));
router.post('/:id/redeem', authenticate, validateParams(redeemParamsSchema), asyncHandler(controller.redeem));

export { router as rewardRoutes };
