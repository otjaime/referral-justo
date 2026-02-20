import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { referralRoutes } from './modules/referral/referral.routes';
import { restaurantRoutes } from './modules/restaurant/restaurant.routes';
import { rewardRoutes } from './modules/reward/reward.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { logger } from './utils/logger';

const app = express();

const publicDir = path.join(process.cwd(), 'public');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.tailwindcss.com',
          'https://unpkg.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

const corsOrigin = config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

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
