import { z } from 'zod'

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().positive().max(999).default(1),
})

export const updateCartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().min(0).max(999),
})

export const cartQuerySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
