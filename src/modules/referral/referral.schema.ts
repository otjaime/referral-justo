import { z } from 'zod';

export const validateCodeParamsSchema = z.object({
  code: z.string().min(1),
});

export const qualifyParamsSchema = z.object({
  id: z.string().uuid(),
});
