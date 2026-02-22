import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número');

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
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterWithReferralInput = z.infer<typeof registerWithReferralSchema>;
