import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@justo.mx' },
    update: {},
    create: {
      email: 'admin@justo.mx',
      password: await bcrypt.hash('admin123', 10),
      name: 'Admin Justo',
      role: UserRole.ADMIN,
    },
  });
  console.log('Admin user:', admin.email);

  // 2. Create referrer user (Alice)
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Alice Referrer',
      role: UserRole.USER,
    },
  });
  console.log('Referrer user:', alice.email);

  // 3. Create referred user (Bob)
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Bob RestaurantOwner',
      role: UserRole.USER,
    },
  });
  console.log('Referred user:', bob.email);

  // 4. Create Alice's referral code
  const code = await prisma.referralCode.upsert({
    where: { code: 'JUSTO-ALICE1' },
    update: {},
    create: {
      code: 'JUSTO-ALICE1',
      referrerUserId: alice.id,
    },
  });
  console.log('Referral code:', code.code);

  // 5. Create Bob's restaurant
  const existingRestaurant = await prisma.restaurant.findFirst({
    where: { ownerId: bob.id, name: 'Tacos El Bob' },
  });

  const restaurant = existingRestaurant ?? await prisma.restaurant.create({
    data: {
      name: 'Tacos El Bob',
      ownerId: bob.id,
      status: 'ACTIVE',
    },
  });
  console.log('Restaurant:', restaurant.name);

  // 6. Create a referral in PENDING status (if none exists)
  const existingReferral = await prisma.referral.findUnique({
    where: { referredRestaurantId: restaurant.id },
  });

  if (!existingReferral) {
    await prisma.referral.create({
      data: {
        referralCodeId: code.id,
        referredRestaurantId: restaurant.id,
        status: 'PENDING',
      },
    });
    console.log('Referral created (PENDING)');

    // Update use count
    await prisma.referralCode.update({
      where: { id: code.id },
      data: { useCount: { increment: 1 } },
    });
  } else {
    console.log('Referral already exists');
  }

  // 7. Another user with no referrals
  const carol = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      email: 'carol@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Carol NewUser',
      role: UserRole.USER,
    },
  });
  console.log('New user:', carol.email);

  console.log('\nSeed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
