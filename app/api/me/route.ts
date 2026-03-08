import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: { id: true, name: true, email: true, image: true, role: true, permissions: true, createdAt: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json() as { name?: string }
  const user = await prisma.user.update({
    where: { id: (session.user as { id: string }).id },
    data: { ...(body.name != null && { name: body.name }) },
    select: { id: true, name: true, email: true, image: true, role: true, permissions: true },
  })
  return NextResponse.json(user)
}
