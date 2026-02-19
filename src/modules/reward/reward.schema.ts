import { z } from 'zod';

export const redeemParamsSchema = z.object({
  id: z.string().uuid(),
});
