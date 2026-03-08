import { prisma } from '@/lib/prisma'
import { getNotificationPreferenceMap } from '@/lib/actions/notificationPreferences'
import { getVariantSignature } from '@/lib/helpers/productVariants'

export async function getUserStockAlerts(userId: string) {
  return prisma.stockAlert.findMany({
    where: { userId },
    include: {
      product: { include: { store: { select: { name: true, slug: true } } } },
      variant: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getUserProductSubscriptions(userId: string) {
  return prisma.productSubscription.findMany({
    where: { userId, isActive: true },
    include: {
      product: { include: { store: { select: { name: true, slug: true } } } },
      variant: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function subscribeUserToStockAlert(userId: string, productId: string, variantId?: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, store: { select: { status: true } } },
  })

  if (!product || !product.isActive || product.approvalStatus !== 'APPROVED' || product.store.status !== 'APPROVED') {
    throw new Error('Product not found')
  }

  const variant = variantId ? product.variants.find((item) => item.id === variantId && item.isActive) : null
  if (variantId && !variant) {
    throw new Error('Variant not found')
  }

  const hasVariants = product.variants.some((item) => item.isActive)
  if (hasVariants && !variant) {
    throw new Error('Please select a variant')
  }

  return prisma.productSubscription.upsert({
    where: {
      userId_productId_variantSignature: {
        userId,
        productId,
        variantSignature: getVariantSignature(variantId),
      },
    },
    update: {
      variantId: variant?.id ?? null,
      isActive: true,
    },
    create: {
      userId,
      productId,
      variantId: variant?.id,
      variantSignature: getVariantSignature(variantId),
      isActive: true,
    },
  })
}

export async function unsubscribeUserFromStockAlert(userId: string, productId: string, variantId?: string) {
  await prisma.productSubscription.deleteMany({
    where: {
      userId,
      productId,
      variantSignature: getVariantSignature(variantId),
    },
  })
}

export async function markUserStockAlertsRead(userId: string) {
  await prisma.stockAlert.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}

export async function createStockAlertsForRestock(input: {
  productId: string
  variantId?: string | null
}) {
  const variantSignature = getVariantSignature(input.variantId ?? undefined)
  const [product, variant, subscriptions] = await Promise.all([
    prisma.product.findUnique({
      where: { id: input.productId },
      include: { store: { select: { name: true, slug: true } } },
    }),
    input.variantId
      ? prisma.productVariant.findUnique({
          where: { id: input.variantId },
        })
      : Promise.resolve(null),
    prisma.productSubscription.findMany({
      where: {
        productId: input.productId,
        variantSignature,
        isActive: true,
      },
    }),
  ])

  if (!product || subscriptions.length === 0) {
    return
  }

  const preferenceMap = await getNotificationPreferenceMap(subscriptions.map((subscription) => subscription.userId))
  const eligibleSubscriptions = subscriptions.filter((subscription) => preferenceMap.get(subscription.userId)?.stockAlerts !== false)
  if (eligibleSubscriptions.length === 0) {
    return
  }

  const title = variant ? `${product.name} (${variant.title}) is back in stock` : `${product.name} is back in stock`
  const body = `The item from ${product.store.name} is available again and ready to order.`
  const now = new Date()

  await prisma.$transaction([
    ...eligibleSubscriptions.map((subscription) =>
      prisma.stockAlert.create({
        data: {
          userId: subscription.userId,
          productId: product.id,
          variantId: variant?.id ?? null,
          variantSignature,
          kind: 'STOCK',
          title,
          body,
        },
      })
    ),
    ...eligibleSubscriptions.map((subscription) =>
      prisma.productSubscription.update({
        where: { id: subscription.id },
        data: { lastNotifiedAt: now },
      })
    ),
  ])
}

export async function createPriceDropAlertsForWishlist(input: {
  productId: string
  previousPrice: number
  nextPrice: number
}) {
  if (!(input.nextPrice < input.previousPrice)) {
    return
  }

  const [product, wishlistItems] = await Promise.all([
    prisma.product.findUnique({
      where: { id: input.productId },
      include: { store: { select: { name: true, slug: true } } },
    }),
    prisma.wishlistItem.findMany({
      where: {
        productId: input.productId,
        variantId: null,
      },
      select: {
        userId: true,
        productId: true,
        variantId: true,
        variantSignature: true,
      },
    }),
  ])

  if (!product || wishlistItems.length === 0) {
    return
  }

  const preferenceMap = await getNotificationPreferenceMap(wishlistItems.map((item) => item.userId))
  const eligibleItems = wishlistItems.filter((item) => preferenceMap.get(item.userId)?.priceDropAlerts !== false)
  if (eligibleItems.length === 0) {
    return
  }

  const discountAmount = input.previousPrice - input.nextPrice
  const discountPercent = input.previousPrice > 0 ? (discountAmount / input.previousPrice) * 100 : 0
  const title = `${product.name} dropped in price`
  const body = `Saved item price moved from $${input.previousPrice.toFixed(2)} to $${input.nextPrice.toFixed(2)} at ${product.store.name}.`

  await prisma.stockAlert.createMany({
    data: eligibleItems.map((item) => ({
      userId: item.userId,
      productId: item.productId,
      variantId: item.variantId,
      variantSignature: item.variantSignature,
      kind: 'PRICE_DROP',
      title,
      body: `${body} You save $${discountAmount.toFixed(2)} (${discountPercent.toFixed(1)}%).`,
    })),
  })
}
