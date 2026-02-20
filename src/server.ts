import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import prisma from './config/prisma';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.PORT;

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');
  } catch (err) {
    logger.error('Database connection failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  app.listen(port, '0.0.0.0', () => {
    logger.info(`Server running on port ${port}`, {
      env: config.NODE_ENV,
    });
  });
}

start();
