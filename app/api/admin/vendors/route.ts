import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { createModerationNotification } from '@/lib/actions/messages'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined

  const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'BANNED' } : {}

  const stores = await prisma.store.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true, email: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    stores.map(({ _count, ...s }) => ({ ...s, productCount: _count.products }))
  )
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const actorId = (session?.user as { id?: string } | null)?.id ?? null
  const body = await req.json() as { id: string; status: 'APPROVED' | 'BANNED'; moderationNote?: string }
  const existing = await prisma.store.findUnique({
    where: { id: body.id },
    include: { vendor: { select: { id: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }
  const store = await prisma.store.update({
    where: { id: body.id },
    data: { status: body.status, moderationNote: body.moderationNote?.trim() || null },
  })
  await prisma.activityLog.create({
    data: {
      actorId,
      action: 'vendor.store.status_updated',
      entityType: 'Store',
      entityId: store.id,
      payload: {
        previousStatus: existing.status,
        nextStatus: body.status,
        moderationNote: body.moderationNote?.trim() || null,
      },
    },
  })
  await createModerationNotification({
    vendorUserId: existing.vendor.id,
    actorId,
    subject: `Store review update: ${store.name}`,
    body: `Your store status is now ${body.status}.${body.moderationNote?.trim() ? ` Note: ${body.moderationNote.trim()}` : ''}`,
    category: 'VENDOR_REVIEW',
  })
  return NextResponse.json(store)
}
