export const JOB_NAMES = {
  EMIT_REWARDS: 'emit-rewards',
} as const;

export interface EmitRewardsPayload {
  referralId: string;
}
