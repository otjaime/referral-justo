import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`, {
    env: config.NODE_ENV,
  });
});
