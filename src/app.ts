import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { referralRoutes } from './modules/referral/referral.routes';
import { restaurantRoutes } from './modules/restaurant/restaurant.routes';
import { rewardRoutes } from './modules/reward/reward.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';

const app = express();

const publicDir = path.join(process.cwd(), 'public');

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(publicDir));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/auth', authRoutes);
app.use('/referrals', referralRoutes);
app.use('/restaurants', restaurantRoutes);
app.use('/rewards', rewardRoutes);
app.use('/analytics', analyticsRoutes);

// SPA catch-all (after API routes, before error handler)
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

export { app };
