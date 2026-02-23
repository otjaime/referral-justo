import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../../config/prisma';
import { config } from '../../config';
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from '../../utils/errors';
import { RegisterInput, LoginInput, RegisterWithReferralInput } from './auth.schema';
import { JwtPayload } from '../../types/express';
import { computeAndSaveScore } from '../referral/scoring.service';

export class AuthService {
  async register(data: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    const token = this.generateToken(user.id, user.role);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    };
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    };
  }

  async registerWithReferral(data: RegisterWithReferralInput) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const referralCode = await prisma.referralCode.findUnique({
      where: { code: data.referralCode },
    });

    if (!referralCode) {
      throw new NotFoundError('Referral code not found');
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      throw new ValidationError('Referral code has expired');
    }

    if (referralCode.maxUses !== null && referralCode.useCount >= referralCode.maxUses) {
      throw new ValidationError('Referral code has reached its maximum uses');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          name: data.restaurantName,
          ownerId: user.id,
          city: data.city,
          numLocations: data.numLocations,
          currentPos: data.currentPos,
          deliveryPct: data.deliveryPct,
          ownerWhatsapp: data.ownerWhatsapp,
          ownerEmail: data.ownerEmail,
        },
      });

      await tx.referralCode.update({
        where: { id: referralCode.id },
        data: { useCount: { increment: 1 } },
      });

      const referral = await tx.referral.create({
        data: {
          referralCodeId: referralCode.id,
          referredRestaurantId: restaurant.id,
          status: 'PENDING',
        },
      });

      return { user, referralId: referral.id };
    });

    // Compute score (await so it's ready when client fetches)
    try {
      await computeAndSaveScore(result.referralId);
    } catch {
      // Scoring failure should not break registration
    }

    const token = this.generateToken(result.user.id, result.user.role);

    return {
      user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
      token,
      referralId: result.referralId,
    };
  }

  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            restaurants: true,
            referralCodes: true,
            rewards: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateToken(userId: string, role: UserRole): string {
    return jwt.sign({ userId, role } satisfies JwtPayload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }
}
