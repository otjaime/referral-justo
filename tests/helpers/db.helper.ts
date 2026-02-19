import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanDatabase() {
  await prisma.reward.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma };
