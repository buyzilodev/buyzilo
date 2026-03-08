import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireActiveAddonApi } from '@/lib/addons/guards'
import { prisma } from '@/lib/prisma'

async function requireStaff() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || !['ADMIN', 'MODERATOR', 'SUPPORT'].includes(user.role ?? '')) {
    return null
  }
  return user
}

export async function GET() {
  const addonBlock = await requireActiveAddonApi('discussion')
  if (addonBlock) return addonBlock
  const user = await requireStaff()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items = await prisma.productDiscussion.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } },
      product: { select: { id: true, name: true, slug: true, store: { select: { name: true, slug: true } } } },
      parent: { select: { id: true, body: true, type: true } },
      replies: {
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json({ items })
}

export async function PATCH(req: Request) {
  const addonBlock = await requireActiveAddonApi('discussion')
  if (addonBlock) return addonBlock
  const user = await requireStaff()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    id?: string
    status?: 'APPROVED' | 'REJECTED' | 'PENDING'
  } | null

  if (!body?.id || !body.status || !['APPROVED', 'REJECTED', 'PENDING'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid moderation request' }, { status: 400 })
  }

  const item = await prisma.productDiscussion.update({
    where: { id: body.id },
    data: { status: body.status },
  })

  return NextResponse.json({ item })
}

export async function DELETE(req: Request) {
  const addonBlock = await requireActiveAddonApi('discussion')
  if (addonBlock) return addonBlock
  const user = await requireStaff()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing discussion id' }, { status: 400 })
  }

  await prisma.productDiscussion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
