import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

async function ensureAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  return role === 'ADMIN' || role === 'MANAGER'
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function GET() {
  if (!(await ensureAdminOrManager())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bundles = await prisma.productBundle.findMany({
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, title: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bundles)
}

export async function POST(req: Request) {
  if (!(await ensureAdminOrManager())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    title?: string
    description?: string
    discountType?: 'PERCENT' | 'FIXED'
    discountValue?: number
    isActive?: boolean
    items?: Array<{ productId: string; variantId?: string; quantity?: number }>
  }

  if (!body.title?.trim() || !Number.isFinite(body.discountValue) || (body.items?.length ?? 0) < 2) {
    return NextResponse.json({ error: 'Title, discount, and at least 2 items are required' }, { status: 400 })
  }

  const baseSlug = slugify(body.title)
  const existing = await prisma.productBundle.findUnique({ where: { slug: baseSlug } })
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  const bundle = await prisma.productBundle.create({
    data: {
      title: body.title.trim(),
      slug,
      description: body.description?.trim() || null,
      discountType: body.discountType ?? 'PERCENT',
      discountValue: Number(body.discountValue),
      isActive: body.isActive ?? true,
      items: {
        create: (body.items ?? []).map((item, index) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: Math.max(1, Number(item.quantity ?? 1)),
          position: index,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, title: true } },
        },
      },
    },
  })

  return NextResponse.json(bundle)
}

export async function PUT(req: Request) {
  if (!(await ensureAdminOrManager())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    id?: string
    title?: string
    description?: string
    discountType?: 'PERCENT' | 'FIXED'
    discountValue?: number
    isActive?: boolean
    items?: Array<{ productId: string; variantId?: string; quantity?: number }>
  }

  if (!body.id) {
    return NextResponse.json({ error: 'Bundle id is required' }, { status: 400 })
  }

  if (body.items && body.items.length < 2) {
    return NextResponse.json({ error: 'A bundle requires at least 2 items' }, { status: 400 })
  }

  await prisma.productBundleItem.deleteMany({ where: { bundleId: body.id } })

  const bundle = await prisma.productBundle.update({
    where: { id: body.id },
    data: {
      ...(body.title ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.discountType ? { discountType: body.discountType } : {}),
      ...(body.discountValue !== undefined ? { discountValue: Number(body.discountValue) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.items
        ? {
          items: {
            create: body.items.map((item, index) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: Math.max(1, Number(item.quantity ?? 1)),
              position: index,
            })),
          },
        }
        : {}),
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, title: true } },
        },
      },
    },
  })

  return NextResponse.json(bundle)
}

export async function DELETE(req: Request) {
  if (!(await ensureAdminOrManager())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Bundle id is required' }, { status: 400 })
  }

  await prisma.productBundle.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
