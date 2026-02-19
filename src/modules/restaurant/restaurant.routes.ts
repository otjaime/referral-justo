import { Router } from 'express';
import { RestaurantController } from './restaurant.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/asyncHandler';
import { registerRestaurantSchema } from './restaurant.schema';

const router = Router();
const controller = new RestaurantController();

router.post(
  '/register',
  authenticate,
  validate(registerRestaurantSchema),
  asyncHandler(controller.register),
);

export { router as restaurantRoutes };
