import { RewardService } from '../../src/modules/reward/reward.service';
import { PrismaClient, ReferralStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    REFERRAL_CODE_PREFIX: 'JUSTO',
    REFERRAL_CODE_LENGTH: 8,
    REFERRAL_REWARD_REFERRER_TYPE: 'CREDITS',
    REFERRAL_REWARD_REFERRER_AMOUNT: 50000,
    REFERRAL_REWARD_REFERRER_DESCRIPTION: '$50.000 CLP en créditos Justo',
    REFERRAL_REWARD_REFERRED_TYPE: 'DISCOUNT',
    REFERRAL_REWARD_REFERRED_AMOUNT: 100000,
    REFERRAL_REWARD_REFERRED_DESCRIPTION: '$100.000 CLP de descuento en tu segundo mes',
    REFERRAL_REWARD_EXPIRES_DAYS: 90,
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    DATABASE_URL: process.env.DATABASE_URL,
  },
}));

// Mock queue to prevent Redis connections in tests
jest.mock('../../src/jobs/reward.job', () => ({
  enqueueRewardEmission: jest.fn(),
}));

const prisma = new PrismaClient();
const rewardService = new RewardService();

beforeEach(async () => {
  await prisma.reward.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('RewardService.emitRewards', () => {
  it('creates two rewards for a qualified referral', async () => {
    // Setup
    const referrer = await prisma.user.create({
      data: {
        email: 'referrer@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer',
        role: UserRole.USER,
      },
    });

    const referred = await prisma.user.create({
      data: {
        email: 'referred@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referred',
        role: UserRole.USER,
      },
    });

    const code = await prisma.referralCode.create({
      data: {
        code: 'JUSTO-TEST01',
        referrerUserId: referrer.id,
      },
    });

    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Test Restaurant',
        ownerId: referred.id,
        status: 'ACTIVE',
      },
    });

    const referral = await prisma.referral.create({
      data: {
        referralCodeId: code.id,
        referredRestaurantId: restaurant.id,
        status: ReferralStatus.QUALIFIED,
        qualifiedAt: new Date(),
      },
    });

    // Act
    const rewards = await rewardService.emitRewards(referral.id);

    // Assert
    expect(rewards).toHaveLength(2);

    const referrerReward = rewards.find((r) => r.beneficiaryType === 'REFERRER');
    expect(referrerReward).toBeDefined();
    expect(referrerReward!.beneficiaryId).toBe(referrer.id);
    expect(referrerReward!.rewardType).toBe('CREDITS');
    expect(referrerReward!.amount).toBe(50000);
    expect(referrerReward!.description).toBe('$50.000 CLP en créditos Justo');
    expect(referrerReward!.status).toBe('ISSUED');
    expect(referrerReward!.expiresAt).toBeDefined();

    const referredReward = rewards.find((r) => r.beneficiaryType === 'REFERRED');
    expect(referredReward).toBeDefined();
    expect(referredReward!.beneficiaryId).toBe(referred.id);
    expect(referredReward!.rewardType).toBe('DISCOUNT');
    expect(referredReward!.amount).toBe(100000);
    expect(referredReward!.description).toBe('$100.000 CLP de descuento en tu segundo mes');
    expect(referredReward!.status).toBe('ISSUED');

    // Referral should be REWARDED
    const updatedReferral = await prisma.referral.findUnique({
      where: { id: referral.id },
    });
    expect(updatedReferral!.status).toBe('REWARDED');
    expect(updatedReferral!.rewardedAt).toBeDefined();
  });

  it('is idempotent - does not create duplicates', async () => {
    const referrer = await prisma.user.create({
      data: {
        email: 'referrer2@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer',
        role: UserRole.USER,
      },
    });

    const referred = await prisma.user.create({
      data: {
        email: 'referred2@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referred',
        role: UserRole.USER,
      },
    });

    const code = await prisma.referralCode.create({
      data: { code: 'JUSTO-IDEM01', referrerUserId: referrer.id },
    });

    const restaurant = await prisma.restaurant.create({
      data: { name: 'Idem Restaurant', ownerId: referred.id, status: 'ACTIVE' },
    });

    const referral = await prisma.referral.create({
      data: {
        referralCodeId: code.id,
        referredRestaurantId: restaurant.id,
        status: ReferralStatus.QUALIFIED,
        qualifiedAt: new Date(),
      },
    });

    // First call
    const rewards1 = await rewardService.emitRewards(referral.id);
    expect(rewards1).toHaveLength(2);

    // Second call (idempotent)
    const rewards2 = await rewardService.emitRewards(referral.id);
    expect(rewards2).toHaveLength(2);

    // Still only 2 rewards in DB
    const allRewards = await prisma.reward.findMany({
      where: { referralId: referral.id },
    });
    expect(allRewards).toHaveLength(2);
  });

  it('sets correct expiration date', async () => {
    const referrer = await prisma.user.create({
      data: {
        email: 'referrer3@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer',
        role: UserRole.USER,
      },
    });

    const referred = await prisma.user.create({
      data: {
        email: 'referred3@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referred',
        role: UserRole.USER,
      },
    });

    const code = await prisma.referralCode.create({
      data: { code: 'JUSTO-EXPIR1', referrerUserId: referrer.id },
    });

    const restaurant = await prisma.restaurant.create({
      data: { name: 'Expiry Restaurant', ownerId: referred.id, status: 'ACTIVE' },
    });

    const referral = await prisma.referral.create({
      data: {
        referralCodeId: code.id,
        referredRestaurantId: restaurant.id,
        status: ReferralStatus.QUALIFIED,
        qualifiedAt: new Date(),
      },
    });

    const now = new Date();
    const rewards = await rewardService.emitRewards(referral.id);

    for (const reward of rewards) {
      const diffDays = Math.round(
        (reward.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(90);
    }
  });
});
