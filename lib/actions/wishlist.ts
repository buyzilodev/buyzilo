import { prisma } from '@/lib/prisma'
import { getVariantSignature } from '@/lib/helpers/productVariants'

export async function getUserWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          store: { select: { name: true, slug: true } },
          category: { select: { name: true, slug: true } },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function addWishlistItem(userId: string, productId: string, variantId?: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  })

  if (!product || !product.isActive || product.approvalStatus !== 'APPROVED') {
    throw new Error('Product not found')
  }

  const variant = variantId
    ? product.variants.find((item) => item.id === variantId && item.isActive)
    : null

  if (variantId && !variant) {
    throw new Error('Variant not found')
  }

  const hasVariants = product.variants.some((item) => item.isActive)
  if (hasVariants && !variant) {
    throw new Error('Please select a variant')
  }

  return prisma.wishlistItem.upsert({
    where: {
      userId_productId_variantSignature: {
        userId,
        productId,
        variantSignature: getVariantSignature(variantId),
      },
    },
    update: {
      variantId: variant?.id ?? null,
    },
    create: {
      userId,
      productId,
      variantId: variant?.id,
      variantSignature: getVariantSignature(variantId),
    },
  })
}

export async function removeWishlistItem(userId: string, productId: string, variantId?: string) {
  await prisma.wishlistItem.deleteMany({
    where: {
      userId,
      productId,
      variantSignature: getVariantSignature(variantId),
    },
  })
}
