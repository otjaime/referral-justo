import { rewardQueue } from '../config/queue';
import { JOB_NAMES, EmitRewardsPayload } from './types';

export async function enqueueRewardEmission(referralId: string): Promise<void> {
  await rewardQueue.add(
    JOB_NAMES.EMIT_REWARDS,
    { referralId } satisfies EmitRewardsPayload,
    { jobId: `reward-${referralId}` },
  );
}
