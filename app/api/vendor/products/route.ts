import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getProductMetaMap } from '@/lib/helpers/productMeta'
import { getProductCatalogSignals } from '@/lib/helpers/productCatalogSignals'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const store = await prisma.store.findUnique({
    where: { vendorId: (session.user as { id: string }).id },
  })
  if (!store) {
    return NextResponse.json({ products: [] })
  }
  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        where: { isActive: true },
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  const metaMap = await getProductMetaMap(products.map((product) => product.id))
  const signalMap = await getProductCatalogSignals(products, metaMap)
  return NextResponse.json({
    products: products.map((product) => {
      const meta = metaMap.get(product.id)
      const signals = signalMap.get(product.id)
      return {
        ...product,
        productType: meta?.catalog?.productType ?? 'PHYSICAL',
        listingType: meta?.catalog?.listingType ?? 'FOR_SALE',
        detailsLanguage: meta?.catalog?.detailsLanguage ?? 'English',
        quoteRequestCount: signals?.quoteRequestCount ?? 0,
        openQuoteRequestCount: signals?.openQuoteRequestCount ?? 0,
        availableLicenseKeys: signals?.availableLicenseKeys ?? 0,
        digitalDownloadCount: signals?.digitalDownloadCount ?? 0,
        variantCount: signals?.variantCount ?? 0,
        riskFlags: signals?.riskFlags ?? [],
      }
    }),
  })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await prisma.store.findUnique({
    where: { vendorId: (session.user as { id: string }).id },
  })
  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const body = await req.json() as {
    ids?: string[]
    action?: 'ACTIVATE' | 'DISABLE'
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  if (ids.length === 0 || !body.action) {
    return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 })
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, storeId: store.id },
    select: { id: true },
  })
  const scopedIds = products.map((product) => product.id)
  if (scopedIds.length === 0) {
    return NextResponse.json({ error: 'No matching products found' }, { status: 404 })
  }

  await prisma.product.updateMany({
    where: { id: { in: scopedIds } },
    data: {
      isActive: body.action === 'ACTIVATE',
    },
  })

  return NextResponse.json({ success: true, count: scopedIds.length })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const store = await prisma.store.findUnique({
    where: { vendorId: (session.user as { id: string }).id },
  })
  if (!store) {
    return NextResponse.json({ error: 'Create a store first' }, { status: 400 })
  }

  const platformSettings = await prisma.siteSettings.findMany({
    where: { key: { in: ['maxProductsPerVendor', 'autoApproveProducts'] } },
  })
  const map: Record<string, string> = {}
  platformSettings.forEach((s) => { map[s.key] = s.value })
  const maxProducts = Number(map.maxProductsPerVendor)
  const autoApproveProducts = map.autoApproveProducts === 'true'

  if (Number.isFinite(maxProducts) && maxProducts > 0) {
    const count = await prisma.product.count({ where: { storeId: store.id } })
    if (count >= maxProducts) {
      return NextResponse.json({ error: `Product limit reached (${maxProducts})` }, { status: 400 })
    }
  }

  const body = await req.json() as {
    name: string
    slug?: string
    description?: string
    price: number
    comparePrice?: number
    stock?: number
    categoryId: string
    images?: string[]
  }
  const slug = (body.slug ?? body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) || 'product'
  const existingSlug = await prisma.product.findUnique({ where: { slug } })
  const finalSlug = existingSlug ? slug + '-' + Date.now() : slug
  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: body.categoryId,
      name: body.name,
      slug: finalSlug,
      description: body.description ?? null,
      price: body.price,
      comparePrice: body.comparePrice ?? null,
      stock: body.stock ?? 0,
      images: body.images ?? [],
      approvalStatus: autoApproveProducts ? 'APPROVED' : 'PENDING',
    },
  })
  return NextResponse.json(product)
}
