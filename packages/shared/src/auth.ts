import { z } from 'zod';

export type Locale = 'az' | 'en';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
  locale: z.enum(['az', 'en']).default('az'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
