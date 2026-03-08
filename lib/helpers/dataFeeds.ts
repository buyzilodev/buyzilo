import { prisma } from '@/lib/prisma'
import { getProductMetaMap } from '@/lib/helpers/productMeta'

export type ProductFeedProvider = 'google-merchant' | 'meta-catalog'

export type ProductFeedConfig = {
  currency: string
  country: string
  includeOutOfStock: boolean
  googleMerchant: boolean
  metaCatalog: boolean
}

export type ProductFeedItem = {
  id: string
  title: string
  description: string
  availability: 'in stock' | 'out of stock'
  condition: 'new'
  price: number
  salePrice: number | null
  link: string
  imageLink: string
  brand: string
  category: string
}

export type ProductFeedRunState = {
  lastRunAt: string | null
  status: 'idle' | 'success' | 'error'
  provider: ProductFeedProvider | null
  itemCount: number
  format: 'xml' | 'csv' | null
  url: string | null
  error: string | null
  history: Array<{
    ranAt: string
    status: 'success' | 'error'
    provider: ProductFeedProvider
    itemCount: number
    format: 'xml' | 'csv'
    url: string
    error?: string | null
  }>
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes'
  }
  return fallback
}

export function parseProductFeedConfig(raw: string | null | undefined): ProductFeedConfig {
  const fallback: ProductFeedConfig = {
    currency: 'USD',
    country: 'US',
    includeOutOfStock: false,
    googleMerchant: false,
    metaCatalog: false,
  }

  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as Partial<ProductFeedConfig>
    return {
      currency: parsed.currency?.trim().toUpperCase() || fallback.currency,
      country: parsed.country?.trim().toUpperCase() || fallback.country,
      includeOutOfStock: parseBoolean(parsed.includeOutOfStock, fallback.includeOutOfStock),
      googleMerchant: parseBoolean(parsed.googleMerchant, fallback.googleMerchant),
      metaCatalog: parseBoolean(parsed.metaCatalog, fallback.metaCatalog),
    }
  } catch {
    return fallback
  }
}

export function parseProductFeedRunState(raw: string | null | undefined): ProductFeedRunState {
  const fallback: ProductFeedRunState = {
    lastRunAt: null,
    status: 'idle',
    provider: null,
    itemCount: 0,
    format: null,
    url: null,
    error: null,
    history: [],
  }

  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as Partial<ProductFeedRunState>
    return {
      ...fallback,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    }
  } catch {
    return fallback
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function csvEscape(value: string) {
  const normalized = value.replace(/"/g, '""')
  return `"${normalized}"`
}

export async function getProductFeedItems(config: ProductFeedConfig): Promise<ProductFeedItem[]> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      approvalStatus: 'APPROVED',
      store: { status: 'APPROVED' },
    },
    include: {
      store: { select: { name: true, slug: true } },
      category: { select: { name: true } },
      variants: {
        where: { isActive: true },
        select: { price: true, comparePrice: true, stock: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  await getProductMetaMap(products.map((product) => product.id))
  const baseUrl = getBaseUrl()

  return products
    .map((product) => {
      const minPrice = product.variants.length
        ? Math.min(...product.variants.map((variant) => variant.price ?? product.price))
        : product.price
      const maxComparePrice = product.variants.length
        ? Math.max(...product.variants.map((variant) => variant.comparePrice ?? product.comparePrice ?? 0)) || product.comparePrice
        : product.comparePrice
      const totalStock = product.variants.length
        ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
        : product.stock

      const image = Array.isArray(product.images) ? product.images.find((entry) => typeof entry === 'string' && entry.trim()) : null
      return {
        id: product.id,
        title: product.name,
        description: stripHtml(product.description || ''),
        availability: totalStock > 0 ? 'in stock' as const : 'out of stock' as const,
        condition: 'new' as const,
        price: minPrice,
        salePrice: maxComparePrice && maxComparePrice > minPrice ? minPrice : null,
        link: `${baseUrl}/products/${product.slug}`,
        imageLink: image ? String(image) : `${baseUrl}/icon`,
        brand: product.store?.name || 'Buyzilo',
        category: product.category?.name || '',
      }
    })
    .filter((item) => (config.includeOutOfStock ? true : item.availability === 'in stock'))
}

function formatPrice(value: number, currency: string) {
  return `${value.toFixed(2)} ${currency}`
}

export function buildGoogleMerchantXml(items: ProductFeedItem[], config: ProductFeedConfig) {
  const rows = items.map((item) => `    <item>
      <g:id>${xmlEscape(item.id)}</g:id>
      <title>${xmlEscape(item.title)}</title>
      <description>${xmlEscape(item.description)}</description>
      <link>${xmlEscape(item.link)}</link>
      <g:image_link>${xmlEscape(item.imageLink)}</g:image_link>
      <g:availability>${xmlEscape(item.availability)}</g:availability>
      <g:condition>${item.condition}</g:condition>
      <g:price>${xmlEscape(formatPrice(item.price, config.currency))}</g:price>
      ${item.salePrice ? `<g:sale_price>${xmlEscape(formatPrice(item.salePrice, config.currency))}</g:sale_price>` : ''}
      <g:brand>${xmlEscape(item.brand)}</g:brand>
      <g:product_type>${xmlEscape(item.category)}</g:product_type>
      <g:google_product_category>${xmlEscape(item.category)}</g:google_product_category>
    </item>`)

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Buyzilo Product Feed</title>
    <link>${xmlEscape(getBaseUrl())}</link>
    <description>Approved marketplace products for channel export</description>
${rows.join('\n')}
  </channel>
</rss>`
}

export function buildMetaCatalogCsv(items: ProductFeedItem[], config: ProductFeedConfig) {
  const header = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'product_type']
  const lines = items.map((item) => [
    item.id,
    item.title,
    item.description,
    item.availability,
    item.condition,
    formatPrice(item.price, config.currency),
    item.link,
    item.imageLink,
    item.brand,
    item.category,
  ].map((value) => csvEscape(String(value))).join(','))

  return [header.join(','), ...lines].join('\n')
}

export function getProductFeedUrl(provider: ProductFeedProvider) {
  return `${getBaseUrl()}/feeds/${provider}`
}

export async function recordProductFeedRun(input: {
  provider: ProductFeedProvider
  status: 'success' | 'error'
  itemCount: number
  format: 'xml' | 'csv'
  url: string
  error?: string | null
}) {
  const existing = await prisma.siteSettings.findUnique({
    where: { key: 'productFeedLastRun' },
    select: { value: true },
  })
  const current = parseProductFeedRunState(existing?.value)
  const next: ProductFeedRunState = {
    lastRunAt: new Date().toISOString(),
    status: input.status,
    provider: input.provider,
    itemCount: input.itemCount,
    format: input.format,
    url: input.url,
    error: input.error || null,
    history: [
      {
        ranAt: new Date().toISOString(),
        status: input.status,
        provider: input.provider,
        itemCount: input.itemCount,
        format: input.format,
        url: input.url,
        error: input.error || null,
      },
      ...current.history,
    ].slice(0, 20),
  }

  await prisma.siteSettings.upsert({
    where: { key: 'productFeedLastRun' },
    update: { value: JSON.stringify(next) },
    create: { key: 'productFeedLastRun', value: JSON.stringify(next) },
  })

  return next
}
