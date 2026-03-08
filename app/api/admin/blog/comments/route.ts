import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  return !!session?.user?.email && !!role && ['ADMIN', 'MANAGER'].includes(role)
}

export async function GET() {
  if (!(await requireAdminOrManager())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const comments = await prisma.blogComment.findMany({
    include: {
      post: { select: { title: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ comments })
}

export async function PATCH(req: Request) {
  if (!(await requireAdminOrManager())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const id = String(body.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Comment id is required' }, { status: 400 })

  const comment = await prisma.blogComment.update({
    where: { id },
    data: { isApproved: Boolean(body.isApproved) },
  })

  return NextResponse.json({ success: true, comment })
}

export async function DELETE(req: Request) {
  if (!(await requireAdminOrManager())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Comment id is required' }, { status: 400 })

  await prisma.blogComment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
