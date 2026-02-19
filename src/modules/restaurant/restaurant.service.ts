import prisma from '../../config/prisma';
import { ReferralService } from '../referral/referral.service';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { RegisterRestaurantInput } from './restaurant.schema';

const referralService = new ReferralService();

export class RestaurantService {
  async register(data: RegisterRestaurantInput & { ownerId: string }) {
    const { name, ownerId, referralCode } = data;

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
        data: { name, ownerId },
      });

      const referral = await referralService.createReferral(
        code.id,
        restaurant.id,
        ownerId,
      );

      return { restaurant, referral };
    }

    const restaurant = await prisma.restaurant.create({
      data: { name, ownerId },
    });

    return { restaurant };
  }
}
