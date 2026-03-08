import { z } from 'zod'

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().positive().max(999),
})

const checkoutLineItemSchema = z.object({
  name: z.string().min(1).max(180),
  price: z.number().positive(),
  quantity: z.number().int().positive().max(999),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  variantLabel: z.string().optional(),
})

export const checkoutContactSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  address: z.string().min(4).max(200),
  city: z.string().min(2).max(100),
  zip: z.string().min(2).max(20),
  country: z.string().min(2).max(100),
})

export const checkoutRequestSchema = checkoutContactSchema.extend({
  useCart: z.boolean().optional(),
  items: z.array(checkoutItemSchema).optional(),
  lineItems: z.array(checkoutLineItemSchema).optional(),
  couponCode: z.string().trim().min(2).max(64).optional(),
  applyStoreCredit: z.boolean().optional(),
  shippingMethodCode: z.string().trim().min(2).max(64).optional(),
  shippingCountry: z.string().trim().min(2).max(3).optional(),
}).superRefine((data, ctx) => {
  const hasUseCart = data.useCart === true
  const hasItems = Array.isArray(data.items) && data.items.length > 0
  const hasLineItems = Array.isArray(data.lineItems) && data.lineItems.length > 0

  if (!hasUseCart && !hasItems && !hasLineItems) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide useCart=true, items, or lineItems',
    })
  }
})

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>
export type CheckoutContactInput = z.infer<typeof checkoutContactSchema>
