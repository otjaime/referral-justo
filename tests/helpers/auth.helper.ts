import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

const prisma = new PrismaClient();

interface CreateUserOptions {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
}

export async function createAuthenticatedUser(overrides: CreateUserOptions = {}) {
  const hashedPassword = await bcrypt.hash(overrides.password ?? 'password123', 10);

  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `user-${Date.now()}@test.com`,
      password: hashedPassword,
      name: overrides.name ?? 'Test User',
      role: overrides.role ?? UserRole.USER,
    },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: '1h' } as jwt.SignOptions,
  );

  return { user, token };
}

export async function createAdminUser(overrides: CreateUserOptions = {}) {
  return createAuthenticatedUser({ ...overrides, role: UserRole.ADMIN });
}
