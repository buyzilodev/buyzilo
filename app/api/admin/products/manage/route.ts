import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createPriceDropAlertsForWishlist } from '@/lib/actions/stockAlerts'

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === 'ADMIN' || role === 'MANAGER'
}

async function getOrCreateAdminStore() {
  // Try to find existing admin store
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) throw new Error('No admin user found')

  let store = await prisma.store.findUnique({
    where: { vendorId: admin.id }
  })

  if (!store) {
    store = await prisma.store.create({
      data: {
        vendorId: admin.id,
        name: 'Admin Store',
        slug: 'admin-store-' + Date.now(),
        description: 'Official admin store',
        status: 'APPROVED',
      }
    })
  }

  return store
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function GET() {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const products = await prisma.product.findMany({
      include: {
        store: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, price, comparePrice, stock, categoryId, images, isActive } = body

    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: 'Name, price and category are required' }, { status: 400 })
    }

    const store = await getOrCreateAdminStore()

    const baseSlug = slugify(name) || 'product'
    const existingSlug = await prisma.product.findUnique({ where: { slug: baseSlug } })
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId,
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        stock: parseInt(stock) || 0,
        images: images || [],
        isActive: isActive !== false,
        approvalStatus: 'APPROVED',
      }
    })

    return NextResponse.json({ success: true, product })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, description, price, comparePrice, stock, categoryId, isActive } = body

    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    let slug = existing.slug
    if (typeof name === 'string' && name.trim() && name.trim() !== existing.name) {
      const baseSlug = slugify(name) || 'product'
      const taken = await prisma.product.findFirst({
        where: { slug: baseSlug, id: { not: id } },
        select: { id: true },
      })
      slug = taken ? `${baseSlug}-${Date.now()}` : baseSlug
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        stock: parseInt(stock) || 0,
        ...(categoryId && { categoryId }),
        isActive,
      }
    })

    const nextPrice = parseFloat(price)
    if (Number.isFinite(nextPrice) && nextPrice < existing.price) {
      await createPriceDropAlertsForWishlist({
        productId: existing.id,
        previousPrice: existing.price,
        nextPrice,
      })
    }

    return NextResponse.json({ success: true, product })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
