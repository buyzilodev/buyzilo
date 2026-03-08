import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccessRestrictionsConfig } from '@/lib/actions/accessRestrictions'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!session?.user || (role !== 'ADMIN' && role !== 'MANAGER')) {
    return null
  }
  return session.user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [config, groups] = await Promise.all([
    getAccessRestrictionsConfig(),
    prisma.userGroup.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    }),
  ])

  return NextResponse.json({ config, groups })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as {
    config?: unknown
  }

  if (!body.config || typeof body.config !== 'object') {
    return NextResponse.json({ error: 'Config is required' }, { status: 400 })
  }

  await prisma.siteSettings.upsert({
    where: { key: 'accessRestrictionsConfig' },
    update: { value: JSON.stringify(body.config) },
    create: { key: 'accessRestrictionsConfig', value: JSON.stringify(body.config) },
  })

  return NextResponse.json({ success: true })
}
