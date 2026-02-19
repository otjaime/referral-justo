import { ReferralStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import { config } from '../../config';
import { generateReferralCode } from '../../utils/codeGenerator';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../utils/errors';
import { enqueueRewardEmission } from '../../jobs/reward.job';

export class ReferralService {
  async getOrCreateCode(userId: string) {
    const existing = await prisma.referralCode.findFirst({
      where: {
        referrerUserId: userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    let code: string;
    let attempts = 0;
    do {
      code = generateReferralCode();
      const exists = await prisma.referralCode.findUnique({ where: { code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Failed to generate unique referral code');
    }

    return prisma.referralCode.create({
      data: {
        code: code!,
        referrerUserId: userId,
      },
    });
  }

  async validateCode(code: string) {
    const referralCode = await prisma.referralCode.findUnique({
      where: { code },
      include: { referrer: { select: { id: true, name: true } } },
    });

    if (!referralCode) {
      throw new NotFoundError('Referral code not found');
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      throw new ValidationError('Referral code has expired');
    }

    if (referralCode.maxUses !== null && referralCode.useCount >= referralCode.maxUses) {
      throw new ValidationError('Referral code has reached its maximum uses');
    }

    const totalReferrals = await prisma.referral.count({
      where: { referralCode: { referrerUserId: referralCode.referrer.id } },
    });

    return {
      code: referralCode.code,
      referrerName: referralCode.referrer.name,
      valid: true,
      referredBenefit: {
        headline: config.REFERRAL_REWARD_REFERRED_DESCRIPTION,
        type: config.REFERRAL_REWARD_REFERRED_TYPE.toUpperCase(),
        amount: config.REFERRAL_REWARD_REFERRED_AMOUNT,
      },
      referrerBenefit: {
        headline: config.REFERRAL_REWARD_REFERRER_DESCRIPTION,
        type: config.REFERRAL_REWARD_REFERRER_TYPE.toUpperCase(),
        amount: config.REFERRAL_REWARD_REFERRER_AMOUNT,
      },
      totalReferrals,
    };
  }

  async createReferral(referralCodeId: string, referredRestaurantId: string, referredOwnerId: string) {
    return prisma.$transaction(async (tx) => {
      const code = await tx.referralCode.findUniqueOrThrow({
        where: { id: referralCodeId },
      });

      if (code.referrerUserId === referredOwnerId) {
        throw new ValidationError('Cannot use your own referral code');
      }

      if (code.expiresAt && code.expiresAt < new Date()) {
        throw new ValidationError('Referral code has expired');
      }

      if (code.maxUses !== null && code.useCount >= code.maxUses) {
        throw new ValidationError('Referral code has reached its maximum uses');
      }

      const existingReferral = await tx.referral.findUnique({
        where: { referredRestaurantId },
      });
      if (existingReferral) {
        throw new ConflictError('This restaurant has already been referred');
      }

      await tx.referralCode.update({
        where: { id: referralCodeId },
        data: { useCount: { increment: 1 } },
      });

      return tx.referral.create({
        data: {
          referralCodeId,
          referredRestaurantId,
          status: ReferralStatus.PENDING,
        },
      });
    });
  }

  async qualifyReferral(referralId: string) {
    const referral = await prisma.referral.findUniqueOrThrow({
      where: { id: referralId },
    });

    if (referral.status !== ReferralStatus.PENDING) {
      throw new ValidationError(`Cannot qualify referral with status: ${referral.status}`);
    }

    const updated = await prisma.referral.update({
      where: { id: referralId },
      data: {
        status: ReferralStatus.QUALIFIED,
        qualifiedAt: new Date(),
      },
    });

    await enqueueRewardEmission(referralId);

    return updated;
  }

  async getSentReferrals(userId: string) {
    const codes = await prisma.referralCode.findMany({
      where: { referrerUserId: userId },
      select: { id: true },
    });

    const codeIds = codes.map((c) => c.id);

    return prisma.referral.findMany({
      where: { referralCodeId: { in: codeIds } },
      include: {
        referredRestaurant: { select: { id: true, name: true, status: true } },
        rewards: { where: { beneficiaryId: userId } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReceivedReferral(userId: string) {
    const restaurants = await prisma.restaurant.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const restaurantIds = restaurants.map((r) => r.id);

    return prisma.referral.findFirst({
      where: { referredRestaurantId: { in: restaurantIds } },
      include: {
        referralCode: {
          include: { referrer: { select: { id: true, name: true } } },
        },
        rewards: { where: { beneficiaryId: userId } },
      },
    });
  }

  async expireReferral(referralId: string) {
    const referral = await prisma.referral.findUniqueOrThrow({
      where: { id: referralId },
    });

    if (referral.status !== ReferralStatus.PENDING) {
      throw new ValidationError(`Cannot expire referral with status: ${referral.status}`);
    }

    return prisma.referral.update({
      where: { id: referralId },
      data: { status: ReferralStatus.EXPIRED },
    });
  }

  async getAllReferrals() {
    return prisma.referral.findMany({
      include: {
        referralCode: {
          include: { referrer: { select: { id: true, name: true, email: true } } },
        },
        referredRestaurant: {
          select: {
            id: true,
            name: true,
            status: true,
            owner: { select: { name: true, email: true } },
          },
        },
        rewards: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
