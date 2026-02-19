import { PrismaClient, UserRole, ReferralStatus, RewardStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash('password123', 10);
  const adminPw = await bcrypt.hash('admin123', 10);

  // ── Users ──────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@justo.mx' },
    update: {},
    create: { email: 'admin@justo.mx', password: adminPw, name: 'Admin Justo', role: UserRole.ADMIN },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { email: 'alice@example.com', password: pw, name: 'Alice Martinez', role: UserRole.USER },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { email: 'bob@example.com', password: pw, name: 'Roberto Sanchez', role: UserRole.USER },
  });

  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: { email: 'carol@example.com', password: pw, name: 'Carolina Lopez', role: UserRole.USER },
  });

  const david = await prisma.user.upsert({
    where: { email: 'david@example.com' },
    update: {},
    create: { email: 'david@example.com', password: pw, name: 'David Hernandez', role: UserRole.USER },
  });

  const elena = await prisma.user.upsert({
    where: { email: 'elena@example.com' },
    update: {},
    create: { email: 'elena@example.com', password: pw, name: 'Elena Ramirez', role: UserRole.USER },
  });

  const fernando = await prisma.user.upsert({
    where: { email: 'fernando@example.com' },
    update: {},
    create: { email: 'fernando@example.com', password: pw, name: 'Fernando Gomez', role: UserRole.USER },
  });

  const gabriela = await prisma.user.upsert({
    where: { email: 'gabriela@example.com' },
    update: {},
    create: { email: 'gabriela@example.com', password: pw, name: 'Gabriela Torres', role: UserRole.USER },
  });

  const hugo = await prisma.user.upsert({
    where: { email: 'hugo@example.com' },
    update: {},
    create: { email: 'hugo@example.com', password: pw, name: 'Hugo Morales', role: UserRole.USER },
  });

  console.log('Users created:', 9);

  // ── Referral Codes ─────────────────────────────────
  const aliceCode = await prisma.referralCode.upsert({
    where: { code: 'JUSTO-ALICE1' },
    update: { useCount: 5 },
    create: { code: 'JUSTO-ALICE1', referrerUserId: alice.id, useCount: 5 },
  });

  const bobCode = await prisma.referralCode.upsert({
    where: { code: 'JUSTO-ROBER1' },
    update: { useCount: 2 },
    create: { code: 'JUSTO-ROBER1', referrerUserId: bob.id, useCount: 2 },
  });

  const carolCode = await prisma.referralCode.upsert({
    where: { code: 'JUSTO-CAROL1' },
    update: { useCount: 1 },
    create: { code: 'JUSTO-CAROL1', referrerUserId: carol.id, useCount: 1 },
  });

  console.log('Referral codes created');

  // ── Helper: create restaurant + referral if not exists ──
  async function createReferredRestaurant(
    name: string,
    ownerId: string,
    codeId: string,
    status: ReferralStatus,
    daysAgo: number,
  ) {
    const existing = await prisma.restaurant.findFirst({ where: { ownerId, name } });
    const restaurant = existing ?? await prisma.restaurant.create({
      data: { name, ownerId, status: status === ReferralStatus.EXPIRED ? 'PENDING' : 'ACTIVE' },
    });

    const existingRef = await prisma.referral.findUnique({ where: { referredRestaurantId: restaurant.id } });
    if (!existingRef) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      await prisma.referral.create({
        data: {
          referralCodeId: codeId,
          referredRestaurantId: restaurant.id,
          status,
          createdAt,
          qualifiedAt: status !== ReferralStatus.PENDING ? new Date(createdAt.getTime() + 2 * 86400000) : undefined,
          rewardedAt: status === ReferralStatus.REWARDED ? new Date(createdAt.getTime() + 3 * 86400000) : undefined,
        },
      });
    }
    return restaurant;
  }

  // ── Restaurants referred by Alice (5) ──────────────
  // Bob's restaurant - QUALIFIED (referral qualified, rewards issued)
  const bobRest = await createReferredRestaurant('Tacos El Patron', bob.id, aliceCode.id, ReferralStatus.QUALIFIED, 30);

  // David's restaurant - REWARDED (fully completed)
  const davidRest = await createReferredRestaurant('Sushi Tokio Express', david.id, aliceCode.id, ReferralStatus.REWARDED, 45);

  // Elena's restaurant - PENDING (waiting to be qualified)
  const elenaRest = await createReferredRestaurant('Cafe La Esquina', elena.id, aliceCode.id, ReferralStatus.PENDING, 5);

  // Fernando's restaurant - PENDING (recent)
  const fernandoRest = await createReferredRestaurant('Pizzeria Napoli', fernando.id, aliceCode.id, ReferralStatus.PENDING, 2);

  // Hugo's restaurant - EXPIRED
  await createReferredRestaurant('Mariscos El Puerto', hugo.id, aliceCode.id, ReferralStatus.EXPIRED, 90);

  console.log('Alice referrals created: 5');

  // ── Restaurants referred by Bob (2) ────────────────
  // Carol's restaurant - QUALIFIED
  const carolRest = await createReferredRestaurant('Birria Don Caro', carol.id, bobCode.id, ReferralStatus.QUALIFIED, 20);

  // Gabriela's restaurant - PENDING
  await createReferredRestaurant('Comedor Casero Gaby', gabriela.id, bobCode.id, ReferralStatus.PENDING, 7);

  console.log('Bob referrals created: 2');

  // ── Restaurant referred by Carol (1) ───────────────
  // Hugo's second restaurant via Carol
  const hugoRest2Existing = await prisma.restaurant.findFirst({ where: { ownerId: hugo.id, name: 'Antojitos Hugo' } });
  const hugoRest2 = hugoRest2Existing ?? await prisma.restaurant.create({
    data: { name: 'Antojitos Hugo', ownerId: hugo.id, status: 'ACTIVE' },
  });
  const hugoRef2 = await prisma.referral.findUnique({ where: { referredRestaurantId: hugoRest2.id } });
  if (!hugoRef2) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 15);
    await prisma.referral.create({
      data: {
        referralCodeId: carolCode.id,
        referredRestaurantId: hugoRest2.id,
        status: ReferralStatus.REWARDED,
        createdAt,
        qualifiedAt: new Date(createdAt.getTime() + 86400000),
        rewardedAt: new Date(createdAt.getTime() + 2 * 86400000),
      },
    });
  }
  console.log('Carol referrals created: 1');

  // ── Rewards ────────────────────────────────────────
  // Helper
  async function createReward(
    referralRestaurantId: string,
    beneficiaryId: string,
    beneficiaryType: 'REFERRER' | 'REFERRED',
    rewardType: 'CREDITS' | 'FEE_WAIVER' | 'DISCOUNT',
    amount: number | null,
    description: string,
    status: RewardStatus,
    daysUntilExpiry: number,
  ) {
    const referral = await prisma.referral.findUnique({ where: { referredRestaurantId: referralRestaurantId } });
    if (!referral) return;
    const existing = await prisma.reward.findFirst({
      where: { referralId: referral.id, beneficiaryId, beneficiaryType },
    });
    if (existing) return;

    const now = new Date();
    await prisma.reward.create({
      data: {
        referralId: referral.id,
        beneficiaryId,
        beneficiaryType,
        rewardType,
        amount,
        description,
        status,
        issuedAt: status !== RewardStatus.PENDING ? now : undefined,
        redeemedAt: status === RewardStatus.REDEEMED ? now : undefined,
        expiresAt: new Date(now.getTime() + daysUntilExpiry * 86400000),
      },
    });
  }

  // Alice's rewards (as REFERRER) ──
  // From David's restaurant (REWARDED) - redeemed
  await createReward(davidRest.id, alice.id, 'REFERRER', 'CREDITS', 500, '$500 MXN en creditos por referir Sushi Tokio Express', RewardStatus.REDEEMED, 30);

  // From Bob's restaurant (QUALIFIED) - issued, available
  await createReward(bobRest.id, alice.id, 'REFERRER', 'CREDITS', 500, '$500 MXN en creditos por referir Tacos El Patron', RewardStatus.ISSUED, 60);

  // From Carol's restaurant via Bob... Alice doesn't get this one

  // Bob's rewards ──
  // As REFERRED (from Alice's code) - issued
  await createReward(bobRest.id, bob.id, 'REFERRED', 'FEE_WAIVER', null, '30 dias sin comision por unirte via referido', RewardStatus.ISSUED, 30);

  // As REFERRER (Carol's restaurant) - issued
  await createReward(carolRest.id, bob.id, 'REFERRER', 'CREDITS', 500, '$500 MXN en creditos por referir Birria Don Caro', RewardStatus.ISSUED, 60);

  // David's reward as REFERRED - redeemed
  await createReward(davidRest.id, david.id, 'REFERRED', 'FEE_WAIVER', null, '30 dias sin comision por unirte via referido', RewardStatus.REDEEMED, 5);

  // Carol's rewards ──
  // As REFERRED (from Bob) - issued
  await createReward(carolRest.id, carol.id, 'REFERRED', 'FEE_WAIVER', null, '30 dias sin comision por unirte via referido', RewardStatus.ISSUED, 45);

  // As REFERRER (Hugo's restaurant) - issued
  await createReward(hugoRest2.id, carol.id, 'REFERRER', 'CREDITS', 500, '$500 MXN en creditos por referir Antojitos Hugo', RewardStatus.ISSUED, 60);

  // Hugo's reward as REFERRED (from Carol) - issued
  await createReward(hugoRest2.id, hugo.id, 'REFERRED', 'DISCOUNT', 200, '20% descuento en comisiones por 30 dias', RewardStatus.ISSUED, 30);

  console.log('Rewards created');

  console.log('\n=== Seed Summary ===');
  console.log('Users: 9 (1 admin + 8 users)');
  console.log('Referral codes: 3 (Alice, Bob, Carol)');
  console.log('Restaurants: 8');
  console.log('Referrals: 8 (2 REWARDED, 2 QUALIFIED, 3 PENDING, 1 EXPIRED)');
  console.log('Rewards: 8');
  console.log('\nLogin credentials:');
  console.log('  Admin:  admin@justo.mx / admin123');
  console.log('  Alice:  alice@example.com / password123 (5 referrals, top referrer)');
  console.log('  Bob:    bob@example.com / password123 (referred + referrer)');
  console.log('  Carol:  carol@example.com / password123 (referred + referrer)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
