import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { REWARD_QUEUE_NAME } from '../config/queue';
import { JOB_NAMES, EmitRewardsPayload } from '../jobs/types';
import { RewardService } from '../modules/reward/reward.service';
import { logger } from '../utils/logger';

if (!redisConnectionOptions) {
  logger.error('REDIS_URL is required to run the worker. Exiting.');
  process.exit(1);
}

const rewardService = new RewardService();

const worker = new Worker(
  REWARD_QUEUE_NAME,
  async (job: Job<EmitRewardsPayload>) => {
    if (job.name === JOB_NAMES.EMIT_REWARDS) {
      const { referralId } = job.data;
      logger.info(`Processing reward emission for referral ${referralId}`);
      await rewardService.emitRewards(referralId);
      logger.info(`Rewards emitted for referral ${referralId}`);
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  },
);

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`, {
    jobId: job?.id,
    error: err.message,
  });
});

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

logger.info('Reward worker started');
