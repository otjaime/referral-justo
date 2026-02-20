import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();
const controller = new AnalyticsController();

router.get('/dashboard', authenticate, requireAdmin, asyncHandler(controller.getDashboard));
router.get('/my-rank', authenticate, asyncHandler(controller.getMyRank));

export { router as analyticsRoutes };
