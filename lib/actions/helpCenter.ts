import { prisma } from '@/lib/prisma'

export type HelpCenterCategory = {
  slug: string
  title: string
  description: string
}

export type HelpCenterArticle = {
  slug: string
  title: string
  excerpt: string
  content: string
  categorySlug: string
  keywords: string[]
  featured?: boolean
  published?: boolean
}

export type HelpCenterConfig = {
  categories: HelpCenterCategory[]
  articles: HelpCenterArticle[]
}

export const defaultHelpCenterConfig: HelpCenterConfig = {
  categories: [
    { slug: 'orders', title: 'Orders and delivery', description: 'Track orders, shipping updates, and delivery questions.' },
    { slug: 'returns', title: 'Returns and refunds', description: 'Understand return eligibility, refund timing, and store credit.' },
    { slug: 'account', title: 'Account and payments', description: 'Profile, login, reward, gift card, and checkout help.' },
  ],
  articles: [
    {
      slug: 'track-order-status',
      title: 'How to track your order status',
      excerpt: 'See where your order is, what each status means, and when shipment tracking appears.',
      content: 'Use your dashboard orders page to follow payment, processing, shipment, and delivery updates. Tracking numbers appear once a shipment is created.',
      categorySlug: 'orders',
      keywords: ['track order', 'shipment', 'delivery'],
      featured: true,
      published: true,
    },
    {
      slug: 'request-a-return',
      title: 'How to request a return',
      excerpt: 'Open a return from your order page and follow the approval and refund flow.',
      content: 'Open the order details page, choose the line item or order, and submit a return reason. Admin review will approve, reject, or refund the request.',
      categorySlug: 'returns',
      keywords: ['return', 'refund', 'rma'],
      featured: true,
      published: true,
    },
    {
      slug: 'use-store-credit-and-gift-cards',
      title: 'Using store credit and gift cards',
      excerpt: 'Apply wallet balance during checkout and understand expiry or redemption rules.',
      content: 'Redeem gift cards from your store-credit page, then apply available balance during checkout. Expiring credit is always consumed first.',
      categorySlug: 'account',
      keywords: ['store credit', 'gift card', 'wallet'],
      featured: false,
      published: true,
    },
  ],
}

export function parseHelpCenterConfig(raw: string | null | undefined): HelpCenterConfig {
  if (!raw) return defaultHelpCenterConfig

  try {
    const parsed = JSON.parse(raw) as Partial<HelpCenterConfig>
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories
          .map((item) => ({
            slug: typeof item?.slug === 'string' ? item.slug.trim() : '',
            title: typeof item?.title === 'string' ? item.title.trim() : '',
            description: typeof item?.description === 'string' ? item.description.trim() : '',
          }))
          .filter((item) => item.slug && item.title)
      : defaultHelpCenterConfig.categories

    const articles = Array.isArray(parsed.articles)
      ? parsed.articles
          .map((item) => ({
            slug: typeof item?.slug === 'string' ? item.slug.trim() : '',
            title: typeof item?.title === 'string' ? item.title.trim() : '',
            excerpt: typeof item?.excerpt === 'string' ? item.excerpt.trim() : '',
            content: typeof item?.content === 'string' ? item.content.trim() : '',
            categorySlug: typeof item?.categorySlug === 'string' ? item.categorySlug.trim() : '',
            keywords: Array.isArray(item?.keywords) ? item.keywords.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())) : [],
            featured: Boolean(item?.featured),
            published: typeof item?.published === 'boolean' ? item.published : true,
          }))
          .filter((item) => item.slug && item.title && item.categorySlug)
      : defaultHelpCenterConfig.articles

    return { categories, articles }
  } catch {
    return defaultHelpCenterConfig
  }
}

export async function getHelpCenterConfig() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'helpCenterConfig' },
    select: { value: true },
  })
  return parseHelpCenterConfig(row?.value)
}

export async function saveHelpCenterConfig(config: HelpCenterConfig) {
  await prisma.siteSettings.upsert({
    where: { key: 'helpCenterConfig' },
    update: { value: JSON.stringify(config) },
    create: { key: 'helpCenterConfig', value: JSON.stringify(config) },
  })
}

export function searchHelpArticles(config: HelpCenterConfig, query: string) {
  const term = query.trim().toLowerCase()
  const publishedArticles = config.articles.filter((article) => article.published !== false)
  if (!term) return publishedArticles

  return publishedArticles
    .map((article) => {
      const haystack = [
        article.title,
        article.excerpt,
        article.content,
        article.categorySlug,
        ...article.keywords,
      ]
        .join(' ')
        .toLowerCase()
      const score =
        (article.title.toLowerCase().includes(term) ? 4 : 0) +
        (article.excerpt.toLowerCase().includes(term) ? 2 : 0) +
        (article.keywords.some((keyword) => keyword.toLowerCase().includes(term)) ? 3 : 0) +
        (haystack.includes(term) ? 1 : 0)
      return { article, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.article.title.localeCompare(right.article.title))
    .map((entry) => entry.article)
}
