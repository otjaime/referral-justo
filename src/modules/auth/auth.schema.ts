import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordSchema,
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registerWithReferralSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordSchema,
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  restaurantName: z.string().min(1, 'El nombre del restaurante es obligatorio').max(200),
  referralCode: z.string().min(1, 'El código de referido es obligatorio'),
  city: z.string().max(100).optional(),
  numLocations: z.coerce.number().int().min(1).optional(),
  currentPos: z.string().max(100).optional(),
  deliveryPct: z.coerce.number().int().min(0).max(100).optional(),
  ownerWhatsapp: z.string().max(20).optional(),
  ownerEmail: z.string().email().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterWithReferralInput = z.infer<typeof registerWithReferralSchema>;
