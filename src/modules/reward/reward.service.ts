import {
  BeneficiaryType,
  ReferralStatus,
  RewardStatus,
} from '@prisma/client';
import prisma from '../../config/prisma';
import { config } from '../../config';
import {
  ValidationError,
  ForbiddenError,
} from '../../utils/errors';

const VALID_REWARD_TYPES = ['CREDITS', 'DISCOUNT', 'FEE_WAIVER', 'CUSTOM'] as const;
type ValidRewardType = typeof VALID_REWARD_TYPES[number];

function toRewardType(value: string): ValidRewardType {
  const upper = value.toUpperCase();
  if (!VALID_REWARD_TYPES.includes(upper as ValidRewardType)) {
    throw new ValidationError(`Invalid reward type: ${value}`);
  }
  return upper as ValidRewardType;
}

export class RewardService {
  async emitRewards(referralId: string) {
    return prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUniqueOrThrow({
        where: { id: referralId },
        include: {
          referralCode: true,
          referredRestaurant: true,
        },
      });

      if (referral.status === ReferralStatus.REWARDED) {
        const existing = await tx.reward.findMany({ where: { referralId } });
        return existing;
      }

      if (referral.status !== ReferralStatus.QUALIFIED) {
        throw new ValidationError(`Cannot emit rewards for referral with status: ${referral.status}`);
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + config.REFERRAL_REWARD_EXPIRES_DAYS);

      const referrerReward = await tx.reward.create({
        data: {
          referralId,
          beneficiaryId: referral.referralCode.referrerUserId,
          beneficiaryType: BeneficiaryType.REFERRER,
          rewardType: toRewardType(config.REFERRAL_REWARD_REFERRER_TYPE),
          amount: config.REFERRAL_REWARD_REFERRER_AMOUNT,
          description: config.REFERRAL_REWARD_REFERRER_DESCRIPTION,
          status: RewardStatus.ISSUED,
          issuedAt: now,
          expiresAt,
        },
      });

      const referredReward = await tx.reward.create({
        data: {
          referralId,
          beneficiaryId: referral.referredRestaurant.ownerId,
          beneficiaryType: BeneficiaryType.REFERRED,
          rewardType: toRewardType(config.REFERRAL_REWARD_REFERRED_TYPE),
          amount: config.REFERRAL_REWARD_REFERRED_AMOUNT,
          description: config.REFERRAL_REWARD_REFERRED_DESCRIPTION,
          status: RewardStatus.ISSUED,
          issuedAt: now,
          expiresAt,
        },
      });

      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.REWARDED,
          rewardedAt: now,
        },
      });

      return [referrerReward, referredReward];
    });
  }

  async getUserRewards(userId: string) {
    return prisma.reward.findMany({
      where: { beneficiaryId: userId },
      include: {
        referral: {
          include: {
            referredRestaurant: { select: { id: true, name: true } },
            referralCode: {
              include: { referrer: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async redeemReward(rewardId: string, userId: string) {
    const reward = await prisma.reward.findUniqueOrThrow({
      where: { id: rewardId },
    });

    if (reward.beneficiaryId !== userId) {
      throw new ForbiddenError('This reward does not belong to you');
    }

    if (reward.status === RewardStatus.REDEEMED) {
      throw new ValidationError('Reward already redeemed');
    }

    if (reward.status !== RewardStatus.ISSUED) {
      throw new ValidationError(`Cannot redeem reward with status: ${reward.status}`);
    }

    if (reward.expiresAt && reward.expiresAt < new Date()) {
      throw new ValidationError('Reward has expired');
    }

    return prisma.reward.update({
      where: { id: rewardId },
      data: {
        status: RewardStatus.REDEEMED,
        redeemedAt: new Date(),
      },
    });
  }

  async getAllRewards() {
    return prisma.reward.findMany({
      include: {
        beneficiary: {
          select: { id: true, name: true, email: true },
        },
        referral: {
          select: {
            id: true,
            status: true,
            referredRestaurant: { select: { id: true, name: true } },
            referralCode: {
              select: {
                code: true,
                referrer: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
