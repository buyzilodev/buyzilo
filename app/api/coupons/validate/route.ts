import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code, isActive: true },
  })

  if (!coupon) {
    return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 404 })
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Coupon expired' }, { status: 400 })
  }

  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ error: 'Coupon limit reached' }, { status: 400 })
  }

  return NextResponse.json({
    discountPercent: coupon.isPercent ? coupon.discount : null,
    discountFixed: !coupon.isPercent ? coupon.discount : null,
    minOrder: coupon.minOrder,
  })
}
