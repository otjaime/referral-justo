import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/asyncHandler';
import { registerSchema, loginSchema, registerWithReferralSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

router.post('/register', validate(registerSchema), asyncHandler(controller.register));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.post('/register-with-referral', validate(registerWithReferralSchema), asyncHandler(controller.registerWithReferral));

export { router as authRoutes };
