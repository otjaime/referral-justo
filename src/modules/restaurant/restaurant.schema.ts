import { z } from 'zod';

export const registerRestaurantSchema = z.object({
  name: z.string().min(1),
  referralCode: z.string().optional(),
  city: z.string().max(100).optional(),
  numLocations: z.coerce.number().int().min(1).optional(),
  currentPos: z.string().max(100).optional(),
  deliveryPct: z.coerce.number().int().min(0).max(100).optional(),
  ownerWhatsapp: z.string().max(20).optional(),
  ownerEmail: z.string().email().optional(),
});

export type RegisterRestaurantInput = z.infer<typeof registerRestaurantSchema>;
