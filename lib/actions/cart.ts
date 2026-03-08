import { prisma } from '@/lib/prisma'
import { getVariantSignature } from '@/lib/helpers/productVariants'
import { parseProductMeta } from '@/lib/helpers/productMeta'
import { getAvailableSellableStock } from '@/lib/helpers/warehouses'
import { addToCartSchema, updateCartItemSchema } from '@/lib/validators/cart'

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } })
  if (existing) return existing

  return prisma.cart.create({
    data: { userId },
  })
}

export async function addItemToUserCart(userId: string, input: unknown) {
  const parsed = addToCartSchema.parse(input)
  const product = await prisma.product.findUnique({
    where: { id: parsed.productId },
    include: { variants: true },
  })

  if (!product || !product.isActive || product.approvalStatus !== 'APPROVED') {
    throw new Error('Product not found')
  }

  const metaRow = await prisma.siteSettings.findUnique({
    where: { key: `productMeta:${product.id}` },
    select: { value: true },
  })
  const meta = parseProductMeta(metaRow?.value)
  const listingType = meta.catalog?.listingType ?? 'FOR_SALE'
  if (listingType === 'ORDINARY' || listingType === 'QUOTE_REQUEST') {
    throw new Error(listingType === 'QUOTE_REQUEST' ? 'This product accepts quote requests instead of direct purchase' : 'This listing is not available for direct purchase')
  }

  const variant = parsed.variantId
    ? product.variants.find((item) => item.id === parsed.variantId && item.isActive)
    : null
  const hasVariants = product.variants.some((item) => item.isActive)

  if (parsed.variantId && !variant) {
    throw new Error('Variant not found')
  }

  if (hasVariants && !variant) {
    throw new Error('Please select a variant')
  }

  const cart = await getOrCreateCart(userId)
  const variantSignature = getVariantSignature(parsed.variantId)
  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId_variantSignature: {
        cartId: cart.id,
        productId: parsed.productId,
        variantSignature,
      },
    },
  })
  const availableStock = await getAvailableSellableStock(product.id, variant?.id)
  const safeRequestedQuantity = Math.min(parsed.quantity, availableStock)

  if (safeRequestedQuantity < 1) {
    throw new Error('This item is out of stock')
  }

  if (existing) {
    const quantity = Math.min(existing.quantity + safeRequestedQuantity, availableStock)
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity },
    })
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: parsed.productId,
        variantId: variant?.id,
        variantSignature,
        quantity: safeRequestedQuantity,
      },
    })
  }
}

export async function updateUserCartItem(userId: string, input: unknown) {
  const parsed = updateCartItemSchema.parse(input)
  const cart = await prisma.cart.findUnique({ where: { userId } })
  if (!cart) return

  if (parsed.quantity === 0) {
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: parsed.productId,
        variantSignature: getVariantSignature(parsed.variantId),
      },
    })
    return
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.productId },
    include: { variants: true },
  })
  if (product) {
    const metaRow = await prisma.siteSettings.findUnique({
      where: { key: `productMeta:${product.id}` },
      select: { value: true },
    })
    const meta = parseProductMeta(metaRow?.value)
    const listingType = meta.catalog?.listingType ?? 'FOR_SALE'
    if (listingType === 'ORDINARY' || listingType === 'QUOTE_REQUEST') {
      throw new Error('This listing is not available for direct purchase')
    }
  }
  const variant = parsed.variantId
    ? product?.variants.find((item) => item.id === parsed.variantId && item.isActive)
    : null
  const availableStock = product ? await getAvailableSellableStock(product.id, variant?.id) : parsed.quantity
  const safeQuantity = Math.min(parsed.quantity, availableStock)

  await prisma.cartItem.updateMany({
    where: {
      cartId: cart.id,
      productId: parsed.productId,
      variantSignature: getVariantSignature(parsed.variantId),
    },
    data: { quantity: safeQuantity },
  })
}

export async function removeUserCartItem(userId: string, productId: string, variantId?: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } })
  if (!cart) return

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId,
      variantSignature: getVariantSignature(variantId),
    },
  })
}

export async function getUserCartWithItems(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              store: { select: { name: true } },
              category: { select: { name: true } },
            },
          },
          variant: true,
        },
      },
    },
  })
}
