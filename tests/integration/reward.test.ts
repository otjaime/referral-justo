import request from 'supertest';
import { PrismaClient, ReferralStatus, UserRole, RewardStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';
import { RewardService } from '../../src/modules/reward/reward.service';

jest.mock('../../src/config/redis', () => ({
  redisConnectionOptions: { host: 'localhost', port: 6379 },
}));

jest.mock('../../src/config/queue', () => ({
  REWARD_QUEUE_NAME: 'reward-emission',
  rewardQueue: { add: jest.fn(), close: jest.fn() },
}));

jest.mock('../../src/jobs/reward.job', () => ({
  enqueueRewardEmission: jest.fn(),
}));

import { app } from '../../src/app';

const prisma = new PrismaClient();
const rewardService = new RewardService();

function makeToken(userId: string) {
  return jwt.sign({ userId, role: 'USER' }, config.JWT_SECRET, { expiresIn: '1h' } as jwt.SignOptions);
}

async function setupReferralWithRewards() {
  const referrer = await prisma.user.create({
    data: {
      email: 'ref-reward@test.com',
      password: await bcrypt.hash('password', 10),
      name: 'Referrer',
    },
  });

  const referred = await prisma.user.create({
    data: {
      email: 'refd-reward@test.com',
      password: await bcrypt.hash('password', 10),
      name: 'Referred',
    },
  });

  const code = await prisma.referralCode.create({
    data: { code: 'JUSTO-RWRD01', referrerUserId: referrer.id },
  });

  const restaurant = await prisma.restaurant.create({
    data: { name: 'Reward Restaurant', ownerId: referred.id, status: 'ACTIVE' },
  });

  const referral = await prisma.referral.create({
    data: {
      referralCodeId: code.id,
      referredRestaurantId: restaurant.id,
      status: ReferralStatus.QUALIFIED,
      qualifiedAt: new Date(),
    },
  });

  // Emit rewards directly (bypassing queue)
  const rewards = await rewardService.emitRewards(referral.id);

  return { referrer, referred, rewards };
}

beforeEach(async () => {
  await prisma.reward.deleteMany();
  await prisma.pipelineEvent.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /rewards', () => {
  it('returns user rewards', async () => {
    const { referrer } = await setupReferralWithRewards();
    const token = makeToken(referrer.id);

    const res = await request(app)
      .get('/rewards')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].beneficiaryType).toBe('REFERRER');
    expect(res.body[0].status).toBe('ISSUED');
  });

  it('returns empty array for user with no rewards', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'noreward@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'NoReward',
      },
    });
    const token = makeToken(user.id);

    const res = await request(app)
      .get('/rewards')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /rewards/:id/redeem', () => {
  it('redeems an issued reward', async () => {
    const { referrer, rewards } = await setupReferralWithRewards();
    const referrerReward = rewards.find((r) => r.beneficiaryType === 'REFERRER')!;
    const token = makeToken(referrer.id);

    const res = await request(app)
      .post(`/rewards/${referrerReward.id}/redeem`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REDEEMED');
    expect(res.body.redeemedAt).toBeDefined();
  });

  it('rejects redeeming another user reward', async () => {
    const { rewards } = await setupReferralWithRewards();
    const referrerReward = rewards.find((r) => r.beneficiaryType === 'REFERRER')!;

    const otherUser = await prisma.user.create({
      data: {
        email: 'other@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Other',
      },
    });
    const token = makeToken(otherUser.id);

    const res = await request(app)
      .post(`/rewards/${referrerReward.id}/redeem`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('rejects redeeming already redeemed reward', async () => {
    const { referrer, rewards } = await setupReferralWithRewards();
    const referrerReward = rewards.find((r) => r.beneficiaryType === 'REFERRER')!;
    const token = makeToken(referrer.id);

    // Redeem first time
    await request(app)
      .post(`/rewards/${referrerReward.id}/redeem`)
      .set('Authorization', `Bearer ${token}`);

    // Try again
    const res = await request(app)
      .post(`/rewards/${referrerReward.id}/redeem`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already redeemed');
  });
});
