import request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

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

import { enqueueRewardEmission } from '../../src/jobs/reward.job';
import { app } from '../../src/app';

const prisma = new PrismaClient();

function makeToken(userId: string, role: string = 'USER') {
  return jwt.sign({ userId, role }, config.JWT_SECRET, { expiresIn: '1h' } as jwt.SignOptions);
}

beforeEach(async () => {
  await prisma.reward.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
  jest.clearAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /referrals/my-code', () => {
  it('creates a code on first call', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'referrer@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer',
      },
    });
    const token = makeToken(user.id);

    const res = await request(app)
      .get('/referrals/my-code')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^JUSTO-/);
    expect(res.body.referrerUserId).toBe(user.id);
  });

  it('returns same code on subsequent calls', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'referrer2@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer2',
      },
    });
    const token = makeToken(user.id);

    const res1 = await request(app)
      .get('/referrals/my-code')
      .set('Authorization', `Bearer ${token}`);

    const res2 = await request(app)
      .get('/referrals/my-code')
      .set('Authorization', `Bearer ${token}`);

    expect(res1.body.code).toBe(res2.body.code);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/referrals/my-code');
    expect(res.status).toBe(401);
  });
});

describe('GET /referrals/validate/:code', () => {
  it('validates an existing code', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'val@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Validator',
      },
    });

    await prisma.referralCode.create({
      data: { code: 'JUSTO-VALID1', referrerUserId: user.id },
    });

    const res = await request(app).get('/referrals/validate/JUSTO-VALID1');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.referrerName).toBe('Validator');
  });

  it('returns 404 for nonexistent code', async () => {
    const res = await request(app).get('/referrals/validate/JUSTO-NOPE01');
    expect(res.status).toBe(404);
  });
});

describe('POST /referrals/:id/qualify', () => {
  it('qualifies a pending referral and enqueues reward job', async () => {
    const referrer = await prisma.user.create({
      data: {
        email: 'ref@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer',
      },
    });

    const referred = await prisma.user.create({
      data: {
        email: 'refd@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referred',
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Admin',
        role: UserRole.ADMIN,
      },
    });

    const code = await prisma.referralCode.create({
      data: { code: 'JUSTO-QUAL01', referrerUserId: referrer.id },
    });

    const restaurant = await prisma.restaurant.create({
      data: { name: 'Qualify Restaurant', ownerId: referred.id },
    });

    const referral = await prisma.referral.create({
      data: {
        referralCodeId: code.id,
        referredRestaurantId: restaurant.id,
        status: 'PENDING',
      },
    });

    const adminToken = makeToken(admin.id, 'ADMIN');

    const res = await request(app)
      .post(`/referrals/${referral.id}/qualify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('QUALIFIED');
    expect(enqueueRewardEmission).toHaveBeenCalledWith(referral.id);
  });

  it('returns 403 for non-admin', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'nonadmin@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'NonAdmin',
      },
    });
    const token = makeToken(user.id, 'USER');

    const res = await request(app)
      .post('/referrals/00000000-0000-0000-0000-000000000000/qualify')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /referrals/sent', () => {
  it('returns referrals created by my codes', async () => {
    const referrer = await prisma.user.create({
      data: {
        email: 'sent@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Sender',
      },
    });

    const referred = await prisma.user.create({
      data: {
        email: 'recv@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Received',
      },
    });

    const code = await prisma.referralCode.create({
      data: { code: 'JUSTO-SENT01', referrerUserId: referrer.id },
    });

    const restaurant = await prisma.restaurant.create({
      data: { name: 'Sent Restaurant', ownerId: referred.id },
    });

    await prisma.referral.create({
      data: {
        referralCodeId: code.id,
        referredRestaurantId: restaurant.id,
        status: 'PENDING',
      },
    });

    const token = makeToken(referrer.id);

    const res = await request(app)
      .get('/referrals/sent')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].referredRestaurant.name).toBe('Sent Restaurant');
  });
});
