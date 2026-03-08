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

async function ensureAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  return role === 'ADMIN' || role === 'MANAGER'
}

async function getOrCreateAdminStore() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) throw new Error('No admin user found')

  const existing = await prisma.store.findUnique({ where: { vendorId: admin.id } })
  if (existing) return existing

  return prisma.store.create({
    data: {
      vendorId: admin.id,
      name: 'Admin Store',
      slug: `admin-store-${Date.now()}`,
      description: 'Official admin store',
      status: 'APPROVED',
    },
  })
}

export async function GET(req: Request) {
  try {
    if (!(await ensureAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('id')?.trim()
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const product = await getProductEditorRecord(productId)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await ensureAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = productEditorPayloadSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid product payload' }, { status: 400 })
    }
    const body = parsed.data
    const general = body.general

    const store = await getOrCreateAdminStore()
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
        approvalStatus: 'APPROVED',
      },
    })

    await replaceProductOptions(product.id, body.options)
    await syncProductVariants(product.id, body.variants)
    await saveProductMeta(product.id, body)
    await syncProductLicenseCommerce(product.id, body)
    await syncProductWarehouseInventory(product.id, store.id)

    return NextResponse.json({ success: true, product })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await ensureAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bodyRaw = await req.json()
    const productId = typeof bodyRaw?.id === 'string' ? bodyRaw.id : ''
    const parsed = productEditorPayloadSchema.safeParse(bodyRaw)
    if (!productId || !parsed.success) {
      return NextResponse.json({ error: 'Invalid product payload' }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, storeId: true, name: true },
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
      },
    })

    await replaceProductOptions(existing.id, body.options)
    await syncProductVariants(existing.id, body.variants)
    await saveProductMeta(existing.id, body)
    await syncProductLicenseCommerce(existing.id, body)
    await syncProductWarehouseInventory(existing.id, existing.storeId)

    return NextResponse.json({ success: true, product })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
