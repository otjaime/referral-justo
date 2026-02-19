import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';

const router = Router();
const controller = new AnalyticsController();

router.get('/dashboard', authenticate, requireAdmin, asyncHandler(controller.getDashboard));

export { router as analyticsRoutes };
