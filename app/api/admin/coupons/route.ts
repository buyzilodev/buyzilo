import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(coupons)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json() as {
    code: string
    discount: number
    isPercent?: boolean
    minOrder?: number
    maxUses?: number
    expiresAt?: string
  }
  const coupon = await prisma.coupon.create({
    data: {
      code: body.code.trim().toUpperCase(),
      discount: body.discount,
      isPercent: body.isPercent ?? true,
      minOrder: body.minOrder ?? null,
      maxUses: body.maxUses ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })
  return NextResponse.json(coupon)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json() as { id: string; isActive?: boolean }
  const coupon = await prisma.coupon.update({
    where: { id: body.id },
    data: { ...(body.isActive !== undefined && { isActive: body.isActive }) },
  })
  return NextResponse.json(coupon)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.coupon.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
