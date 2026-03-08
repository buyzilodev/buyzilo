import { prisma } from '@/lib/prisma'

export type ProductMeta = {
  catalog?: {
    productType?: 'PHYSICAL' | 'DIGITAL'
    listingType?: 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS'
    detailsLanguage?: string
  }
  seo?: {
    seoName?: string
    pageTitle?: string
    metaDescription?: string
    metaKeywords?: string
  }
  quantityDiscounts?: Array<{ quantity: number; value: number; type: 'ABSOLUTE' | 'PERCENT'; userGroup: string }>
  addons?: {
    outOfStockAction?: string
    searchWords?: string
    popularity?: number
  }
  tags?: string[]
  requiredProducts?: string[]
  unitPricing?: {
    quantity?: number
    unit?: string
  }
  attachments?: Array<{ name: string; url: string }>
  digitalDownloads?: Array<{ name: string; url: string; note?: string | null }>
  customAttributes?: Array<{
    name: string
    displayType?: 'TEXT' | 'IMAGE' | 'COLOR'
    values: Array<{ label: string; value: string; image?: string | null }>
  }>
  licenseKeys?: Array<{
    id?: string
    code: string
    note?: string | null
    variantKey?: string | null
    variantLabel?: string | null
    isActive?: boolean
  }>
  shortDescription?: string
  promoText?: string
  videos?: Array<{ url: string; host: string }>
}

export function parseProductMeta(raw: string | null | undefined): ProductMeta {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as ProductMeta
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function getProductMetaMap(productIds: string[]) {
  if (productIds.length === 0) {
    return new Map<string, ProductMeta>()
  }

  const rows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: productIds.map((id) => `productMeta:${id}`),
      },
    },
  })

  return new Map(
    rows.map((row) => {
      const productId = row.key.replace(/^productMeta:/, '')
      return [productId, parseProductMeta(row.value)]
    })
  )
}

export async function getProductTagMap(productIds: string[]) {
  const metaMap = await getProductMetaMap(productIds)
  return new Map(
    productIds.map((productId) => {
      const tags = (metaMap.get(productId)?.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
      return [productId, tags]
    })
  )
}

export async function getRequiredProductIdsMap(productIds: string[]) {
  const metaMap = await getProductMetaMap(productIds)
  return new Map(
    productIds.map((productId) => {
      const requiredProducts = Array.from(
        new Set(
          (metaMap.get(productId)?.requiredProducts ?? [])
            .map((item) => item.trim())
            .filter(Boolean)
            .filter((item) => item !== productId)
        )
      )
      return [productId, requiredProducts]
    })
  )
}
