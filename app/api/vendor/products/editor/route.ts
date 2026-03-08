import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import {
  ensureUniqueProductSlug,
  getProductEditorRecord,
  replaceProductOptions,
  saveProductMeta,
  syncProductLicenseCommerce,
  syncProductVariants,
  syncProductWarehouseInventory,
} from '@/lib/helpers/productEditor'
import { productEditorPayloadSchema } from '@/lib/validators/product'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const productId = searchParams.get('id')?.trim()
  if (!productId) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
  }

  const product = await getProductEditorRecord(productId)
  if (!product || product.store.vendorId !== userId) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json({ product })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (!store) {
    return NextResponse.json({ error: 'Create a store first' }, { status: 400 })
  }

  const parsed = productEditorPayloadSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product payload' }, { status: 400 })
  }
  const body = parsed.data
  const general = body.general

  const platformSettings = await prisma.siteSettings.findMany({
    where: { key: { in: ['maxProductsPerVendor', 'autoApproveProducts'] } },
  })
  const map: Record<string, string> = {}
  platformSettings.forEach((setting) => { map[setting.key] = setting.value })
  const maxProducts = Number(map.maxProductsPerVendor)
  const autoApproveProducts = map.autoApproveProducts === 'true'

  if (Number.isFinite(maxProducts) && maxProducts > 0) {
    const count = await prisma.product.count({ where: { storeId: store.id } })
    if (count >= maxProducts) {
      return NextResponse.json({ error: `Product limit reached (${maxProducts})` }, { status: 400 })
    }
  }

  const slug = await ensureUniqueProductSlug(general.name)
  const isActive = general.status === 'ACTIVE'

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: general.categoryId,
      name: general.name,
      slug,
      description: general.description || '',
      price: Number(general.price),
      comparePrice: general.comparePrice != null ? Number(general.comparePrice) : null,
      stock: Number(general.stock ?? 0),
      images: Array.isArray(general.images) ? general.images : [],
      isActive,
      approvalStatus: autoApproveProducts ? 'APPROVED' : 'PENDING',
    },
  })

  await replaceProductOptions(product.id, body.options)
  await syncProductVariants(product.id, body.variants)
  await saveProductMeta(product.id, body)
  await syncProductLicenseCommerce(product.id, body)
  await syncProductWarehouseInventory(product.id, store.id)

  return NextResponse.json({ success: true, product })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (!store) {
    return NextResponse.json({ error: 'Create a store first' }, { status: 400 })
  }

  const bodyRaw = await req.json()
  const productId = typeof bodyRaw?.id === 'string' ? bodyRaw.id : ''
  const parsed = productEditorPayloadSchema.safeParse(bodyRaw)
  if (!productId || !parsed.success) {
    return NextResponse.json({ error: 'Invalid product payload' }, { status: 400 })
  }

  const existing = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true, storeId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const body = parsed.data
  const general = body.general
  const slug = await ensureUniqueProductSlug(general.name, existing.id)

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      categoryId: general.categoryId,
      name: general.name,
      slug,
      description: general.description || '',
      price: Number(general.price),
      comparePrice: general.comparePrice != null ? Number(general.comparePrice) : null,
      stock: Number(general.stock ?? 0),
      images: Array.isArray(general.images) ? general.images : [],
      isActive: general.status === 'ACTIVE',
      approvalStatus: 'PENDING',
    },
  })

  await replaceProductOptions(existing.id, body.options)
  await syncProductVariants(existing.id, body.variants)
  await saveProductMeta(existing.id, body)
  await syncProductLicenseCommerce(existing.id, body)
  await syncProductWarehouseInventory(existing.id, existing.storeId)

  return NextResponse.json({ success: true, product })
}
