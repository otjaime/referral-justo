import prisma from '../../config/prisma';
import { ReferralService } from '../referral/referral.service';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { RegisterRestaurantInput } from './restaurant.schema';

const referralService = new ReferralService();

export class RestaurantService {
  async register(data: RegisterRestaurantInput & { ownerId: string }) {
    const { name, ownerId, referralCode, city, numLocations, currentPos, deliveryPct, ownerWhatsapp, ownerEmail } = data;

    const restaurantFields = {
      name,
      ownerId,
      city,
      numLocations,
      currentPos,
      deliveryPct,
      ownerWhatsapp,
      ownerEmail,
    };

    if (referralCode) {
      const code = await prisma.referralCode.findUnique({
        where: { code: referralCode },
      });

      if (!code) {
        throw new NotFoundError('Referral code not found');
      }

      if (code.referrerUserId === ownerId) {
        throw new ValidationError('Cannot use your own referral code');
      }

      const restaurant = await prisma.restaurant.create({
        data: restaurantFields,
      });

      const referral = await referralService.createReferral(
        code.id,
        restaurant.id,
        ownerId,
      );

      return { restaurant, referral };
    }

    const restaurant = await prisma.restaurant.create({
      data: restaurantFields,
    });

    return { restaurant };
  }

  async getAllRestaurants() {
    return prisma.restaurant.findMany({
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        referral: {
          select: {
            id: true,
            status: true,
            scoreTotal: true,
            pipelineStatus: true,
            createdAt: true,
            referralCode: {
              select: {
                code: true,
                referrer: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
