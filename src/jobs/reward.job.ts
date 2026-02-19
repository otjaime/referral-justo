import { getRewardQueue } from '../config/queue';
import { JOB_NAMES, EmitRewardsPayload } from './types';
import { RewardService } from '../modules/reward/reward.service';
import { logger } from '../utils/logger';

export async function enqueueRewardEmission(referralId: string): Promise<void> {
  const queue = getRewardQueue();

  if (queue) {
    await queue.add(
      JOB_NAMES.EMIT_REWARDS,
      { referralId } satisfies EmitRewardsPayload,
      { jobId: `reward-${referralId}` },
    );
    logger.info(`Reward job enqueued for referral ${referralId}`);
  } else {
    logger.info(`Processing rewards synchronously for referral ${referralId}`);
    const rewardService = new RewardService();
    await rewardService.emitRewards(referralId);
  }
}
