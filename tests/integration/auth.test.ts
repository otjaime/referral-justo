import request from 'supertest';
import { PrismaClient } from '@prisma/client';

// Mock queue to prevent Redis connections during tests
jest.mock('../../src/config/redis', () => ({
  redisConnectionOptions: { host: 'localhost', port: 6379 },
}));

jest.mock('../../src/config/queue', () => ({
  REWARD_QUEUE_NAME: 'reward-emission',
  rewardQueue: {
    add: jest.fn(),
    close: jest.fn(),
  },
}));

jest.mock('../../src/jobs/reward.job', () => ({
  enqueueRewardEmission: jest.fn(),
}));

import { app } from '../../src/app';

const prisma = new PrismaClient();

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

describe('POST /auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@test.com', password: 'password123', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@test.com');
    expect(res.body.user.name).toBe('Test User');
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@test.com', password: 'password123', name: 'First' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@test.com', password: 'password123', name: 'Second' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@test.com', password: 'password123', name: 'Login User' });
  });

  it('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@test.com');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for nonexistent email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});
