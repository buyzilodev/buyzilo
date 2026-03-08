import { prisma } from '@/lib/prisma'

export type VendorRatingSummary = {
  averageRating: number | null
  reviewCount: number
  lowRatingCount: number
}

export async function getVendorRatingSummary(storeId: string): Promise<VendorRatingSummary> {
  const reviews = await prisma.review.findMany({
    where: { product: { storeId } },
    select: { rating: true },
  })

  if (reviews.length === 0) {
    return {
      averageRating: null,
      reviewCount: 0,
      lowRatingCount: 0,
    }
  }

  const reviewCount = reviews.length
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount,
    lowRatingCount: reviews.filter((review) => review.rating <= 2).length,
  }
}

export async function getVendorRatingSummaryMap(storeIds: string[]) {
  const uniqueStoreIds = Array.from(new Set(storeIds.filter(Boolean)))
  if (uniqueStoreIds.length === 0) {
    return new Map<string, VendorRatingSummary>()
  }

  const reviews = await prisma.review.findMany({
    where: { product: { storeId: { in: uniqueStoreIds } } },
    select: {
      rating: true,
      product: { select: { storeId: true } },
    },
  })

  const grouped = new Map<string, number[]>()
  for (const storeId of uniqueStoreIds) {
    grouped.set(storeId, [])
  }

  for (const review of reviews) {
    grouped.get(review.product.storeId)?.push(review.rating)
  }

  const summaryMap = new Map<string, VendorRatingSummary>()
  for (const storeId of uniqueStoreIds) {
    const ratings = grouped.get(storeId) ?? []
    if (ratings.length === 0) {
      summaryMap.set(storeId, {
        averageRating: null,
        reviewCount: 0,
        lowRatingCount: 0,
      })
      continue
    }

    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    summaryMap.set(storeId, {
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: ratings.length,
      lowRatingCount: ratings.filter((rating) => rating <= 2).length,
    })
  }

  return summaryMap
}
