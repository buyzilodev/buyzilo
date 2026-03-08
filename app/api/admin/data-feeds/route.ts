import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getProductFeedItems,
  getProductFeedUrl,
  parseProductFeedConfig,
  parseProductFeedRunState,
  recordProductFeedRun,
  type ProductFeedProvider,
} from '@/lib/helpers/dataFeeds'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [configRow, lastRunRow] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'productFeedConfig' }, select: { value: true } }),
    prisma.siteSettings.findUnique({ where: { key: 'productFeedLastRun' }, select: { value: true } }),
  ])

  const config = parseProductFeedConfig(configRow?.value)
  const items = await getProductFeedItems(config)

  return NextResponse.json({
    config,
    itemCount: items.length,
    providers: {
      'google-merchant': {
        enabled: config.googleMerchant,
        format: 'xml',
        url: getProductFeedUrl('google-merchant'),
      },
      'meta-catalog': {
        enabled: config.metaCatalog,
        format: 'csv',
        url: getProductFeedUrl('meta-catalog'),
      },
    },
    lastRun: parseProductFeedRunState(lastRunRow?.value),
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { provider?: ProductFeedProvider }
  const provider = body.provider
  if (provider !== 'google-merchant' && provider !== 'meta-catalog') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const configRow = await prisma.siteSettings.findUnique({
    where: { key: 'productFeedConfig' },
    select: { value: true },
  })
  const config = parseProductFeedConfig(configRow?.value)
  const enabled = provider === 'google-merchant' ? config.googleMerchant : config.metaCatalog

  if (!enabled) {
    const state = await recordProductFeedRun({
      provider,
      status: 'error',
      itemCount: 0,
      format: provider === 'google-merchant' ? 'xml' : 'csv',
      url: getProductFeedUrl(provider),
      error: 'Feed disabled',
    })
    return NextResponse.json({ error: 'Feed disabled', lastRun: state }, { status: 400 })
  }

  const items = await getProductFeedItems(config)
  const state = await recordProductFeedRun({
    provider,
    status: 'success',
    itemCount: items.length,
    format: provider === 'google-merchant' ? 'xml' : 'csv',
    url: getProductFeedUrl(provider),
  })

  return NextResponse.json({
    success: true,
    itemCount: items.length,
    provider,
    url: getProductFeedUrl(provider),
    lastRun: state,
  })
}
