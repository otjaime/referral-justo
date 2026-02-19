import { z } from 'zod';

export const registerRestaurantSchema = z.object({
  name: z.string().min(1),
  referralCode: z.string().optional(),
});

export type RegisterRestaurantInput = z.infer<typeof registerRestaurantSchema>;
