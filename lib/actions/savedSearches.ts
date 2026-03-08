import { prisma } from '@/lib/prisma'
import { getNotificationPreferences } from '@/lib/actions/notificationPreferences'
import { getStorefrontProductList } from '@/lib/queries/storefront'

export type SavedSearchItem = {
  id: string
  label: string
  search?: string
  category?: string
  tag?: string
  sort?: 'default' | 'price-low' | 'price-high' | 'newest'
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
  createdAt: string
  lastViewedAt?: string | null
  lastResultCount: number
}

function getSavedSearchKey(userId: string) {
  return `savedSearches:${userId}`
}

async function readSavedSearches(userId: string): Promise<SavedSearchItem[]> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getSavedSearchKey(userId) },
  })

  if (!row?.value) {
    return []
  }

  try {
    const parsed = JSON.parse(row.value) as SavedSearchItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeSavedSearches(userId: string, items: SavedSearchItem[]) {
  await prisma.siteSettings.upsert({
    where: { key: getSavedSearchKey(userId) },
    update: { value: JSON.stringify(items) },
    create: { key: getSavedSearchKey(userId), value: JSON.stringify(items) },
  })
}

export async function getSavedSearches(userId: string) {
  const items = await readSavedSearches(userId)
  const preferences = await getNotificationPreferences(userId)
  const hydrated = await Promise.all(
    items.map(async (item) => {
      const result = await getStorefrontProductList({
        search: item.search,
        category: item.category,
        tag: item.tag,
        sort: item.sort,
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        inStock: item.inStock,
        minRating: item.minRating,
        page: 1,
        limit: 1,
      })
      return {
        ...item,
        currentResultCount: result.total,
        hasNewResults: preferences.savedSearchAlerts ? result.total > (item.lastResultCount ?? 0) : false,
      }
    })
  )

  return hydrated.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export async function createSavedSearch(userId: string, input: {
  label?: string
  search?: string
  category?: string
  tag?: string
  sort?: 'default' | 'price-low' | 'price-high' | 'newest'
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
}) {
  const existing = await readSavedSearches(userId)
  const result = await getStorefrontProductList({
    search: input.search,
    category: input.category,
    tag: input.tag,
    sort: input.sort,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    inStock: input.inStock,
    minRating: input.minRating,
    page: 1,
    limit: 1,
  })

  const item: SavedSearchItem = {
    id: `search_${Date.now()}`,
    label: input.label?.trim() || input.search?.trim() || input.category || input.tag?.trim() || 'Saved search',
    search: input.search?.trim() || undefined,
    category: input.category?.trim() || undefined,
    tag: input.tag?.trim() || undefined,
    sort: input.sort ?? 'default',
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    inStock: input.inStock,
    minRating: input.minRating,
    createdAt: new Date().toISOString(),
    lastViewedAt: null,
    lastResultCount: result.total,
  }

  const next = [item, ...existing].slice(0, 20)
  await writeSavedSearches(userId, next)
  return item
}

export async function removeSavedSearch(userId: string, id: string) {
  const existing = await readSavedSearches(userId)
  const next = existing.filter((item) => item.id !== id)
  await writeSavedSearches(userId, next)
}

export async function markSavedSearchSeen(userId: string, id: string) {
  const existing = await readSavedSearches(userId)
  const next = await Promise.all(
    existing.map(async (item) => {
      if (item.id !== id) return item
      const result = await getStorefrontProductList({
        search: item.search,
        category: item.category,
        tag: item.tag,
        sort: item.sort,
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        inStock: item.inStock,
        minRating: item.minRating,
        page: 1,
        limit: 1,
      })
      return {
        ...item,
        lastViewedAt: new Date().toISOString(),
        lastResultCount: result.total,
      }
    })
  )
  await writeSavedSearches(userId, next)
}
