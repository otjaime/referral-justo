import { ReferralStatus, PipelineStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import { config } from '../../config';
import { generateReferralCode } from '../../utils/codeGenerator';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../utils/errors';
import { enqueueRewardEmission } from '../../jobs/reward.job';
import { computeAndSaveScore, ScoreResult } from './scoring.service';
import { PipelineUpdateInput } from './referral.schema';

// ─── Valid pipeline transitions ────────────────────

const VALID_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
  [PipelineStatus.PENDING]: [PipelineStatus.QUALIFIED, PipelineStatus.DEAD],
  [PipelineStatus.QUALIFIED]: [PipelineStatus.DEMO_SCHEDULED, PipelineStatus.NURTURE, PipelineStatus.DEAD],
  [PipelineStatus.DEMO_SCHEDULED]: [PipelineStatus.MEETING_HELD, PipelineStatus.NO_SHOW, PipelineStatus.DEAD],
  [PipelineStatus.MEETING_HELD]: [PipelineStatus.WON, PipelineStatus.LOST, PipelineStatus.NURTURE, PipelineStatus.DEAD],
  [PipelineStatus.WON]: [],
  [PipelineStatus.LOST]: [PipelineStatus.NURTURE],
  [PipelineStatus.NO_SHOW]: [PipelineStatus.DEMO_SCHEDULED, PipelineStatus.NURTURE, PipelineStatus.DEAD],
  [PipelineStatus.NURTURE]: [PipelineStatus.DEMO_SCHEDULED, PipelineStatus.DEAD],
  [PipelineStatus.DEAD]: [],
};

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
      select: {
        id: true,
        status: true,
        scoreTotal: true,
        pipelineStatus: true,
        createdAt: true,
        qualifiedAt: true,
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
            city: true,
            numLocations: true,
            currentPos: true,
            deliveryPct: true,
            ownerWhatsapp: true,
            ownerEmail: true,
            owner: { select: { name: true, email: true } },
          },
        },
        rewards: true,
        pipelineEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Phase 3: Scoring ─────────────────────────────

  async getScore(referralId: string): Promise<ScoreResult> {
    const referral = await prisma.referral.findUniqueOrThrow({
      where: { id: referralId },
      select: {
        scoreFit: true,
        scoreIntent: true,
        scoreEngage: true,
        scoreTotal: true,
        scoredAt: true,
      },
    });

    // If already scored, return stored values
    if (referral.scoredAt != null) {
      return {
        fit: referral.scoreFit ?? 0,
        intent: referral.scoreIntent ?? 0,
        engage: referral.scoreEngage ?? 0,
        total: referral.scoreTotal ?? 0,
      };
    }

    // Otherwise compute fresh
    return computeAndSaveScore(referralId);
  }

  // ─── Phase 4: Pipeline ────────────────────────────

  async updatePipeline(referralId: string, data: PipelineUpdateInput, adminUserId: string) {
    const referral = await prisma.referral.findUniqueOrThrow({
      where: { id: referralId },
    });

    const updateData: Record<string, unknown> = {};
    let needsRescore = false;

    // Handle status transition
    if (data.status && data.status !== referral.pipelineStatus) {
      const allowed = VALID_TRANSITIONS[referral.pipelineStatus] || [];
      if (!allowed.includes(data.status as PipelineStatus)) {
        throw new ValidationError(
          `Invalid transition from ${referral.pipelineStatus} to ${data.status}. Allowed: ${allowed.join(', ') || 'none'}`,
        );
      }
      updateData.pipelineStatus = data.status;

      // Track special timestamps
      if (data.status === 'DEMO_SCHEDULED' && data.demoScheduledAt) {
        updateData.demoScheduledAt = data.demoScheduledAt;
      }
      if (data.status === 'MEETING_HELD') {
        updateData.meetingHeldAt = new Date();
        if (data.meetingOutcome) {
          updateData.meetingOutcome = data.meetingOutcome;
        }
      }
    }

    // Handle optional pipeline fields
    if (data.note !== undefined) {
      updateData.notes = data.note;
    }
    if (data.nurtureStage !== undefined) {
      updateData.nurtureStage = data.nurtureStage;
    }
    if (data.nextActionAt !== undefined) {
      updateData.nextActionAt = data.nextActionAt;
    }
    if (data.demoScheduledAt !== undefined) {
      updateData.demoScheduledAt = data.demoScheduledAt;
    }

    // Handle intent/engagement signal updates
    const signalFields = [
      'usedCalculator', 'usedDiagnostic', 'requestedDemo', 'fromMetaAd',
      'respondedWa', 'openedMessages', 'responseTimeMin',
    ] as const;

    for (const field of signalFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
        needsRescore = true;
      }
    }

    // Perform the update + create event in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.referral.update({
        where: { id: referralId },
        data: updateData,
      });

      // Create status change event
      if (data.status && data.status !== referral.pipelineStatus) {
        await tx.pipelineEvent.create({
          data: {
            referralId,
            eventType: 'STATUS_CHANGE',
            fromStatus: referral.pipelineStatus,
            toStatus: data.status as PipelineStatus,
            note: data.note ?? null,
            createdBy: adminUserId,
          },
        });
      }

      // Create note event if note provided without status change
      if (data.note && (!data.status || data.status === referral.pipelineStatus)) {
        await tx.pipelineEvent.create({
          data: {
            referralId,
            eventType: 'NOTE',
            note: data.note,
            createdBy: adminUserId,
          },
        });
      }

      return result;
    });

    // Re-score if signals changed
    if (needsRescore) {
      await computeAndSaveScore(referralId);
    }

    return updated;
  }

  // ─── Phase 4: Timeline ────────────────────────────

  async getTimeline(referralId: string) {
    // Verify referral exists
    await prisma.referral.findUniqueOrThrow({
      where: { id: referralId },
    });

    return prisma.pipelineEvent.findMany({
      where: { referralId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
