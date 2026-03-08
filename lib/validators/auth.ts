import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().min(1),
  password: z.string().min(6).max(128),
  referralCode: z.string().trim().min(3).max(32).optional(),
  recaptchaToken: z.string().trim().min(1).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
