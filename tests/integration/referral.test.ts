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
  await prisma.pipelineEvent.deleteMany();
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

// ─── Helper to create a full referral setup ───────────
async function createReferralSetup(opts?: { city?: string; numLocations?: number; currentPos?: string }) {
  const referrer = await prisma.user.create({
    data: {
      email: 'setup-referrer@test.com',
      password: await bcrypt.hash('password', 10),
      name: 'Setup Referrer',
    },
  });
  const referred = await prisma.user.create({
    data: {
      email: 'setup-referred@test.com',
      password: await bcrypt.hash('password', 10),
      name: 'Setup Referred',
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: 'setup-admin@test.com',
      password: await bcrypt.hash('password', 10),
      name: 'Admin',
      role: UserRole.ADMIN,
    },
  });
  const code = await prisma.referralCode.create({
    data: { code: 'JUSTO-SETUP1', referrerUserId: referrer.id },
  });
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Setup Restaurant',
      ownerId: referred.id,
      city: opts?.city ?? null,
      numLocations: opts?.numLocations ?? null,
      currentPos: opts?.currentPos ?? null,
    },
  });
  const referral = await prisma.referral.create({
    data: {
      referralCodeId: code.id,
      referredRestaurantId: restaurant.id,
      status: 'PENDING',
    },
  });
  return { referrer, referred, admin, code, restaurant, referral };
}

// ─── Phase 3: Scoring ─────────────────────────────────

describe('GET /referrals/:id/score', () => {
  it('computes and returns a score for a referral', async () => {
    const { referral, referred } = await createReferralSetup({
      city: 'CDMX',
      numLocations: 3,
      currentPos: 'Square',
    });
    const token = makeToken(referred.id, 'USER');

    const res = await request(app)
      .get(`/referrals/${referral.id}/score`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fit');
    expect(res.body).toHaveProperty('intent');
    expect(res.body).toHaveProperty('engage');
    expect(res.body).toHaveProperty('total');
    // CDMX=10, 3 locations=7, Square POS=5
    expect(res.body.fit).toBe(22);
    expect(res.body.total).toBe(22);
  });

  it('returns stored score on second call (idempotent)', async () => {
    const { referral, referred } = await createReferralSetup({ city: 'Monterrey' });
    const token = makeToken(referred.id, 'USER');

    const res1 = await request(app)
      .get(`/referrals/${referral.id}/score`)
      .set('Authorization', `Bearer ${token}`);

    const res2 = await request(app)
      .get(`/referrals/${referral.id}/score`)
      .set('Authorization', `Bearer ${token}`);

    expect(res1.body.total).toBe(res2.body.total);
  });

  it('returns 401 without auth', async () => {
    const { referral } = await createReferralSetup();

    const res = await request(app).get(`/referrals/${referral.id}/score`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for nonexistent referral', async () => {
    const { referred } = await createReferralSetup();
    const token = makeToken(referred.id, 'USER');

    const res = await request(app)
      .get('/referrals/00000000-0000-4000-8000-000000000001/score')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── Phase 4: Pipeline ────────────────────────────────

describe('PATCH /referrals/:id/pipeline', () => {
  it('transitions from PENDING to QUALIFIED', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'QUALIFIED' });

    expect(res.status).toBe(200);
    expect(res.body.pipelineStatus).toBe('QUALIFIED');
  });

  it('transitions from QUALIFIED to DEMO_SCHEDULED with date', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    // First go to QUALIFIED
    await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'QUALIFIED' });

    const demoDate = new Date('2026-03-01T10:00:00Z');
    const res = await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DEMO_SCHEDULED', demoScheduledAt: demoDate.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.pipelineStatus).toBe('DEMO_SCHEDULED');
    expect(res.body.demoScheduledAt).toBeDefined();
  });

  it('rejects invalid transition (PENDING → WON)', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    const res = await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WON' });

    expect(res.status).toBe(400);
  });

  it('rejects transition from terminal state (DEAD)', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    // Move to DEAD
    await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DEAD' });

    // Try to move out of DEAD
    const res = await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'QUALIFIED' });

    expect(res.status).toBe(400);
  });

  it('creates a pipeline event on status change', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'QUALIFIED', note: 'Looks promising' });

    const events = await prisma.pipelineEvent.findMany({
      where: { referralId: referral.id },
    });

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('STATUS_CHANGE');
    expect(events[0].fromStatus).toBe('PENDING');
    expect(events[0].toStatus).toBe('QUALIFIED');
    expect(events[0].note).toBe('Looks promising');
    expect(events[0].createdBy).toBe(admin.id);
  });

  it('re-scores when signal fields are updated', async () => {
    const { referral, admin } = await createReferralSetup({ city: 'CDMX' });
    const adminToken = makeToken(admin.id, 'ADMIN');

    // First get initial score
    const score1 = await request(app)
      .get(`/referrals/${referral.id}/score`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Update signals
    await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ respondedWa: true, openedMessages: 5 });

    // Get updated score
    const score2 = await request(app)
      .get(`/referrals/${referral.id}/score`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(score2.body.engage).toBeGreaterThan(score1.body.engage);
    expect(score2.body.total).toBeGreaterThan(score1.body.total);
  });

  it('returns 403 for non-admin', async () => {
    const { referral, referred } = await createReferralSetup();
    const userToken = makeToken(referred.id, 'USER');

    const res = await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'QUALIFIED' });

    expect(res.status).toBe(403);
  });
});

// ─── Phase 4: Timeline ───────────────────────────────

describe('GET /referrals/:id/timeline', () => {
  it('returns timeline events in reverse chronological order', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    // Create multiple transitions
    await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'QUALIFIED', note: 'First' });

    await request(app)
      .patch(`/referrals/${referral.id}/pipeline`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DEMO_SCHEDULED', demoScheduledAt: '2026-03-01T10:00:00Z' });

    const res = await request(app)
      .get(`/referrals/${referral.id}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Most recent first
    expect(res.body[0].toStatus).toBe('DEMO_SCHEDULED');
    expect(res.body[1].toStatus).toBe('QUALIFIED');
    expect(res.body[1].note).toBe('First');
  });

  it('returns empty array for referral with no events', async () => {
    const { referral, admin } = await createReferralSetup();
    const adminToken = makeToken(admin.id, 'ADMIN');

    const res = await request(app)
      .get(`/referrals/${referral.id}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('returns 403 for non-admin', async () => {
    const { referral, referred } = await createReferralSetup();
    const userToken = makeToken(referred.id, 'USER');

    const res = await request(app)
      .get(`/referrals/${referral.id}/timeline`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});
