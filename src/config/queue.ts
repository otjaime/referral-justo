import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis';
import { logger } from '../utils/logger';

export const REWARD_QUEUE_NAME = 'reward-emission';

let _rewardQueue: Queue | null = null;
let _initialized = false;

export function getRewardQueue(): Queue | null {
  if (_initialized) return _rewardQueue;
  _initialized = true;

  if (!redisConnectionOptions) {
    logger.info('Redis not configured — rewards will be processed synchronously');
    return null;
  }

  try {
    _rewardQueue = new Queue(REWARD_QUEUE_NAME, {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  } catch (err) {
    logger.warn('Failed to create BullMQ queue — falling back to sync', {
      error: (err as Error).message,
    });
  }

  return _rewardQueue;
}
