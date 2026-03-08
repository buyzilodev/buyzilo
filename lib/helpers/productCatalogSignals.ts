import { prisma } from '@/lib/prisma'
import type { ProductMeta } from '@/lib/helpers/productMeta'
import { parseQuoteRequest, type QuoteRequestRecord } from '@/lib/actions/productCommercial'
import { type LicenseKeyInventoryRow } from '@/lib/actions/licenseKeys'

type ProductCatalogSignal = {
  quoteRequestCount: number
  openQuoteRequestCount: number
  availableLicenseKeys: number
  digitalDownloadCount: number
  variantCount: number
  riskFlags: string[]
}

function parseRows<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildRiskFlags(input: {
  approvalStatus?: string | null
  stock: number
  listingType: 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS'
  productType: 'PHYSICAL' | 'DIGITAL'
  openQuoteRequestCount: number
  availableLicenseKeys: number
  digitalDownloadCount: number
}) {
  const flags: string[] = []

  if (input.approvalStatus === 'PENDING') {
    flags.push('Pending review')
  }

  if (input.listingType === 'QUOTE_REQUEST' && input.openQuoteRequestCount > 0) {
    flags.push('Quote pressure')
  }

  if (input.listingType === 'LICENSE_KEYS' && input.availableLicenseKeys <= 0) {
    flags.push('No license stock')
  }

  if (input.productType === 'DIGITAL' && input.listingType !== 'LICENSE_KEYS' && input.digitalDownloadCount <= 0) {
    flags.push('No download files')
  }

  if (input.listingType === 'FOR_SALE' && input.stock <= 0 && input.productType !== 'DIGITAL') {
    flags.push('Out of stock')
  }

  return flags
}

export async function getProductCatalogSignals(
  products: Array<{
    id: string
    stock: number
    approvalStatus?: string | null
    variants?: Array<{ id: string }>
  }>,
  metaMap: Map<string, ProductMeta>
) {
  if (products.length === 0) {
    return new Map<string, ProductCatalogSignal>()
  }

  const productIds = products.map((product) => product.id)
  const [quoteRows, licenseRows] = await Promise.all([
    prisma.siteSettings.findMany({
      where: { key: { startsWith: 'quoteRequest:' } },
      select: { value: true },
      take: 1000,
    }),
    prisma.siteSettings.findMany({
      where: {
        key: {
          in: productIds.map((id) => `productLicenseInventory:${id}`),
        },
      },
      select: { key: true, value: true },
    }),
  ])

  const quoteCounts = new Map<string, { total: number; open: number }>()
  for (const row of quoteRows) {
    const parsed = parseQuoteRequest(row.value) as QuoteRequestRecord | null
    if (!parsed || !productIds.includes(parsed.productId)) {
      continue
    }
    const current = quoteCounts.get(parsed.productId) ?? { total: 0, open: 0 }
    current.total += 1
    if (parsed.status !== 'CLOSED') {
      current.open += 1
    }
    quoteCounts.set(parsed.productId, current)
  }

  const licenseCounts = new Map<string, number>()
  for (const row of licenseRows) {
    const productId = row.key.replace('productLicenseInventory:', '')
    const inventory = parseRows<LicenseKeyInventoryRow>(row.value)
    const available = inventory.filter((item) => item.isActive && !item.assignedOrderId).length
    licenseCounts.set(productId, available)
  }

  return new Map(
    products.map((product) => {
      const meta = metaMap.get(product.id)
      const productType = meta?.catalog?.productType ?? 'PHYSICAL'
      const listingType = meta?.catalog?.listingType ?? 'FOR_SALE'
      const digitalDownloadCount = meta?.digitalDownloads?.filter((item) => item.url?.trim()).length ?? 0
      const counts = quoteCounts.get(product.id) ?? { total: 0, open: 0 }
      const availableLicenseKeys = licenseCounts.get(product.id) ?? 0

      const signal: ProductCatalogSignal = {
        quoteRequestCount: counts.total,
        openQuoteRequestCount: counts.open,
        availableLicenseKeys,
        digitalDownloadCount,
        variantCount: product.variants?.length ?? 0,
        riskFlags: buildRiskFlags({
          approvalStatus: product.approvalStatus,
          stock: product.stock,
          listingType,
          productType,
          openQuoteRequestCount: counts.open,
          availableLicenseKeys,
          digitalDownloadCount,
        }),
      }

      return [product.id, signal]
    })
  )
}
