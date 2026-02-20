import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/asyncHandler';
import { authLimiter } from '../../middleware/rateLimiter';
import { registerSchema, loginSchema, registerWithReferralSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(controller.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(controller.login));
router.post('/register-with-referral', authLimiter, validate(registerWithReferralSchema), asyncHandler(controller.registerWithReferral));

export { router as authRoutes };
