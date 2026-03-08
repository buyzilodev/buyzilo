import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === 'ADMIN' || role === 'MANAGER'
}

function normalizeFeatures(input: unknown) {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 40)
}

export async function GET() {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [plans, groupedSubs] = await Promise.all([
      prisma.vendorPlan.findMany({
        orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.vendorSubscription.groupBy({
        by: ['planId', 'status'],
        _count: { _all: true },
      }),
    ])

    const countByPlan = new Map<string, number>()
    groupedSubs.forEach((entry) => {
      if (entry.status !== 'ACTIVE') return
      const current = countByPlan.get(entry.planId) ?? 0
      countByPlan.set(entry.planId, current + entry._count._all)
    })

    const payload = plans.map((plan) => {
      const subscribers = countByPlan.get(plan.id) ?? 0
      return {
        ...plan,
        subscribers,
        monthlyRevenue: Number((plan.price * subscribers).toFixed(2)),
      }
    })

    return NextResponse.json(payload)
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
    const name = String(body.name ?? '').trim()
    const price = Number(body.price)
    const billingCycle = String(body.billingCycle ?? 'monthly').trim().toLowerCase()
    const productLimit = Number(body.productLimit)
    const commissionRate = Number(body.commissionRate)
    const features = normalizeFeatures(body.features)

    if (!name || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid name or price' }, { status: 400 })
    }
    if (!Number.isFinite(productLimit) || productLimit < 0) {
      return NextResponse.json({ error: 'Invalid product limit' }, { status: 400 })
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return NextResponse.json({ error: 'Invalid commission rate' }, { status: 400 })
    }

    const plan = await prisma.vendorPlan.create({
      data: {
        name,
        price,
        billingCycle: billingCycle || 'monthly',
        productLimit: Math.floor(productLimit),
        commissionRate,
        features,
        isActive: body.isActive !== false,
      },
    })

    return NextResponse.json({ success: true, plan })
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
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Plan id is required' }, { status: 400 })

    const updates: {
      name?: string
      price?: number
      billingCycle?: string
      productLimit?: number
      commissionRate?: number
      features?: string[]
      isActive?: boolean
    } = {}

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) return NextResponse.json({ error: 'Invalid plan name' }, { status: 400 })
      updates.name = name
    }
    if (body.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
      updates.price = price
    }
    if (body.billingCycle !== undefined) {
      updates.billingCycle = String(body.billingCycle).trim().toLowerCase() || 'monthly'
    }
    if (body.productLimit !== undefined) {
      const productLimit = Number(body.productLimit)
      if (!Number.isFinite(productLimit) || productLimit < 0) {
        return NextResponse.json({ error: 'Invalid product limit' }, { status: 400 })
      }
      updates.productLimit = Math.floor(productLimit)
    }
    if (body.commissionRate !== undefined) {
      const commissionRate = Number(body.commissionRate)
      if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json({ error: 'Invalid commission rate' }, { status: 400 })
      }
      updates.commissionRate = commissionRate
    }
    if (body.features !== undefined) {
      updates.features = normalizeFeatures(body.features)
    }
    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive)
    }

    const plan = await prisma.vendorPlan.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ success: true, plan })
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

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')?.trim()
    if (!id) return NextResponse.json({ error: 'Plan id is required' }, { status: 400 })

    const activeSubscriptions = await prisma.vendorSubscription.count({
      where: { planId: id, status: 'ACTIVE' },
    })
    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscriptions. Disable it instead.' },
        { status: 400 }
      )
    }

    await prisma.vendorPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
