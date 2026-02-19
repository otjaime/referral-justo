import request from 'supertest';
import { PrismaClient } from '@prisma/client';
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

import { app } from '../../src/app';

const prisma = new PrismaClient();

function makeToken(userId: string) {
  return jwt.sign({ userId, role: 'USER' }, config.JWT_SECRET, { expiresIn: '1h' } as jwt.SignOptions);
}

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

describe('POST /restaurants/register', () => {
  it('creates restaurant without referral code', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'owner@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Owner',
      },
    });
    const token = makeToken(user.id);

    const res = await request(app)
      .post('/restaurants/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Restaurant' });

    expect(res.status).toBe(201);
    expect(res.body.restaurant.name).toBe('My Restaurant');
    expect(res.body.referral).toBeUndefined();
  });

  it('creates restaurant with valid referral code', async () => {
    const referrer = await prisma.user.create({
      data: {
        email: 'referrer@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referrer',
      },
    });

    const referred = await prisma.user.create({
      data: {
        email: 'referred@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Referred',
      },
    });

    await prisma.referralCode.create({
      data: { code: 'JUSTO-REG001', referrerUserId: referrer.id },
    });

    const token = makeToken(referred.id);

    const res = await request(app)
      .post('/restaurants/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Referred Restaurant', referralCode: 'JUSTO-REG001' });

    expect(res.status).toBe(201);
    expect(res.body.restaurant.name).toBe('Referred Restaurant');
    expect(res.body.referral).toBeDefined();
    expect(res.body.referral.status).toBe('PENDING');
  });

  it('rejects self-referral', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'self@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Self Referrer',
      },
    });

    await prisma.referralCode.create({
      data: { code: 'JUSTO-SELF01', referrerUserId: user.id },
    });

    const token = makeToken(user.id);

    const res = await request(app)
      .post('/restaurants/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Self Restaurant', referralCode: 'JUSTO-SELF01' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('own referral code');
  });

  it('rejects invalid referral code', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'invalid@test.com',
        password: await bcrypt.hash('password', 10),
        name: 'Invalid',
      },
    });
    const token = makeToken(user.id);

    const res = await request(app)
      .post('/restaurants/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Invalid Restaurant', referralCode: 'JUSTO-FAKE01' });

    expect(res.status).toBe(404);
  });
});
