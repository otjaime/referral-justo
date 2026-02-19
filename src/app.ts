import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { referralRoutes } from './modules/referral/referral.routes';
import { restaurantRoutes } from './modules/restaurant/restaurant.routes';
import { rewardRoutes } from './modules/reward/reward.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/referrals', referralRoutes);
app.use('/restaurants', restaurantRoutes);
app.use('/rewards', rewardRoutes);

app.use(errorHandler);

export { app };
