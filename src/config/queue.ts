import { Queue } from 'bullmq';
import { redisConnectionOptions } from './redis';

export const REWARD_QUEUE_NAME = 'reward-emission';

export const rewardQueue = new Queue(REWARD_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
