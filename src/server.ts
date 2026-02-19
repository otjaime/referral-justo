import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.PORT;

app.listen(port, '0.0.0.0', () => {
  logger.info(`Server running on port ${port}`, {
    env: config.NODE_ENV,
  });
});
