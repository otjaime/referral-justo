import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(8).default('change-me-in-production-min8'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  REFERRAL_CODE_PREFIX: z.string().default('JUSTO'),
  REFERRAL_CODE_LENGTH: z.coerce.number().default(8),
  REFERRAL_QUALIFY_EVENT: z.string().default('first_order'),
  REFERRAL_REWARD_REFERRER_TYPE: z.string().default('credits'),
  REFERRAL_REWARD_REFERRER_AMOUNT: z.coerce.number().default(50000),
  REFERRAL_REWARD_REFERRER_DESCRIPTION: z.string().default('$50.000 CLP en créditos Justo'),
  REFERRAL_REWARD_REFERRED_TYPE: z.string().default('discount'),
  REFERRAL_REWARD_REFERRED_AMOUNT: z.coerce.number().default(100000),
  REFERRAL_REWARD_REFERRED_DESCRIPTION: z.string().default('$100.000 CLP de descuento en tu segundo mes'),
  REFERRAL_REWARD_EXPIRES_DAYS: z.coerce.number().default(90),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
