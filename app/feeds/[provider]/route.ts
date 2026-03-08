import { NextResponse } from 'next/server'
import {
  buildGoogleMerchantXml,
  buildMetaCatalogCsv,
  getProductFeedItems,
  parseProductFeedConfig,
} from '@/lib/helpers/dataFeeds'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params

  const row = await prisma.siteSettings.findUnique({
    where: { key: 'productFeedConfig' },
    select: { value: true },
  })
  const config = parseProductFeedConfig(row?.value)

  if (provider === 'google-merchant') {
    if (!config.googleMerchant) {
      return new NextResponse('Feed disabled', { status: 404 })
    }

    const items = await getProductFeedItems(config)
    return new NextResponse(buildGoogleMerchantXml(items, config), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=900, stale-while-revalidate=3600',
      },
    })
  }

  if (provider === 'meta-catalog') {
    if (!config.metaCatalog) {
      return new NextResponse('Feed disabled', { status: 404 })
    }

    const items = await getProductFeedItems(config)
    return new NextResponse(buildMetaCatalogCsv(items, config), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 's-maxage=900, stale-while-revalidate=3600',
      },
    })
  }

  return new NextResponse('Feed not found', { status: 404 })
}
