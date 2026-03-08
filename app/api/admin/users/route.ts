import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const roleFilter = searchParams.get('role') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 200)
  const offset = Number(searchParams.get('offset')) || 0

  const where = roleFilter ? { role: roleFilter as 'BUYER' | 'VENDOR' | 'ADMIN' | 'MANAGER' | 'SUPPORT' | 'FINANCE' | 'MODERATOR' } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total })
}
