import { PipelineStatus } from '@prisma/client';
import prisma from '../../config/prisma';
import { enqueueRewardEmission } from '../../jobs/reward.job';

// ─── Types ─────────────────────────────────────────

export interface ScoreInput {
  // FIT signals
  city?: string | null;
  numLocations?: number | null;
  currentPos?: string | null;
  deliveryPct?: number | null;
  ownerWhatsapp?: string | null;
  ownerEmail?: string | null;

  // INTENT signals
  usedCalculator: boolean;
  usedDiagnostic: boolean;
  requestedDemo: boolean;
  fromMetaAd: boolean;

  // ENGAGE signals
  respondedWa: boolean;
  openedMessages: number;
  responseTimeMin?: number | null;
}

export interface ScoreResult {
  fit: number;
  intent: number;
  engage: number;
  total: number;
}

// ─── Scoring Constants ─────────────────────────────

const TIER1_CITIES = ['cdmx', 'monterrey', 'guadalajara', 'ciudad de mexico', 'ciudad de méxico'];
const KNOWN_POS_SYSTEMS = ['poster', 'softrestaurant', 'square', 'toast', 'aloha', 'revel', 'lightspeed', 'clover', 'micros'];

const AUTO_QUALIFY_THRESHOLD = 60;

// ─── Pure Scoring Function ─────────────────────────

export function calculateScore(input: ScoreInput): ScoreResult {
  let fit = 0;
  let intent = 0;
  let engage = 0;

  // --- FIT (max ~35) ---
  // City in Tier1: +10
  if (input.city && TIER1_CITIES.includes(input.city.toLowerCase().trim())) {
    fit += 10;
  }

  // numLocations: 1 => +3, 2-5 => +7, 6+ => +10
  if (input.numLocations != null) {
    if (input.numLocations >= 6) {
      fit += 10;
    } else if (input.numLocations >= 2) {
      fit += 7;
    } else if (input.numLocations >= 1) {
      fit += 3;
    }
  }

  // currentPos is known system: +5
  if (input.currentPos && KNOWN_POS_SYSTEMS.includes(input.currentPos.toLowerCase().trim())) {
    fit += 5;
  }

  // deliveryPct: >50 => +5, >20 => +3
  if (input.deliveryPct != null) {
    if (input.deliveryPct > 50) {
      fit += 5;
    } else if (input.deliveryPct > 20) {
      fit += 3;
    }
  }

  // Has WhatsApp: +3
  if (input.ownerWhatsapp) {
    fit += 3;
  }

  // Has email: +2
  if (input.ownerEmail) {
    fit += 2;
  }

  // --- INTENT (max ~35) ---
  // usedCalculator: +10
  if (input.usedCalculator) {
    intent += 10;
  }

  // usedDiagnostic: +10
  if (input.usedDiagnostic) {
    intent += 10;
  }

  // requestedDemo: +10
  if (input.requestedDemo) {
    intent += 10;
  }

  // fromMetaAd: +5
  if (input.fromMetaAd) {
    intent += 5;
  }

  // --- ENGAGE (max ~30) ---
  // respondedWa: +10
  if (input.respondedWa) {
    engage += 10;
  }

  // openedMessages: 1-2 => +3, 3-5 => +7, 6+ => +10
  if (input.openedMessages >= 6) {
    engage += 10;
  } else if (input.openedMessages >= 3) {
    engage += 7;
  } else if (input.openedMessages >= 1) {
    engage += 3;
  }

  // responseTimeMin: <30 => +10, <120 => +5, <480 => +2
  if (input.responseTimeMin != null) {
    if (input.responseTimeMin < 30) {
      engage += 10;
    } else if (input.responseTimeMin < 120) {
      engage += 5;
    } else if (input.responseTimeMin < 480) {
      engage += 2;
    }
  }

  const total = fit + intent + engage;

  return { fit, intent, engage, total };
}

// ─── Compute & Persist ─────────────────────────────

export async function computeAndSaveScore(referralId: string): Promise<ScoreResult> {
  const referral = await prisma.referral.findUniqueOrThrow({
    where: { id: referralId },
    include: {
      referredRestaurant: true,
    },
  });

  const restaurant = referral.referredRestaurant;

  const input: ScoreInput = {
    city: restaurant.city,
    numLocations: restaurant.numLocations,
    currentPos: restaurant.currentPos,
    deliveryPct: restaurant.deliveryPct,
    ownerWhatsapp: restaurant.ownerWhatsapp,
    ownerEmail: restaurant.ownerEmail,
    usedCalculator: referral.usedCalculator,
    usedDiagnostic: referral.usedDiagnostic,
    requestedDemo: referral.requestedDemo,
    fromMetaAd: referral.fromMetaAd,
    respondedWa: referral.respondedWa,
    openedMessages: referral.openedMessages,
    responseTimeMin: referral.responseTimeMin,
  };

  const score = calculateScore(input);

  const shouldAutoQualify =
    score.total >= AUTO_QUALIFY_THRESHOLD &&
    referral.pipelineStatus === PipelineStatus.PENDING;

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referralId },
      data: {
        scoreFit: score.fit,
        scoreIntent: score.intent,
        scoreEngage: score.engage,
        scoreTotal: score.total,
        scoredAt: new Date(),
        ...(shouldAutoQualify
          ? {
              pipelineStatus: PipelineStatus.QUALIFIED,
              status: 'QUALIFIED',
              qualifiedAt: new Date(),
            }
          : {}),
      },
    });

    // Log score update event
    await tx.pipelineEvent.create({
      data: {
        referralId,
        eventType: 'SCORE_UPDATE',
        note: `Score updated: FIT=${score.fit} INTENT=${score.intent} ENGAGE=${score.engage} TOTAL=${score.total}`,
      },
    });

    // Log auto-qualification event
    if (shouldAutoQualify) {
      await tx.pipelineEvent.create({
        data: {
          referralId,
          eventType: 'AUTO_QUALIFIED',
          fromStatus: PipelineStatus.PENDING,
          toStatus: PipelineStatus.QUALIFIED,
          note: `Auto-qualified: score ${score.total} >= ${AUTO_QUALIFY_THRESHOLD}`,
        },
      });

      // Enqueue reward emission on auto-qualify
      await enqueueRewardEmission(referralId);
    }
  });

  return score;
}
