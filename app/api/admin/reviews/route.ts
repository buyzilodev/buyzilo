import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function canManageReviews() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === 'ADMIN' || role === 'MANAGER' || role === 'MODERATOR'
}

export async function GET() {
  if (!(await canManageReviews())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const reviews = await prisma.review.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: {
        select: {
          name: true,
          slug: true,
          store: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 250,
  })

  return NextResponse.json({ reviews })
}

export async function DELETE(req: Request) {
  if (!(await canManageReviews())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Review id required' }, { status: 400 })
  }

  await prisma.review.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
