import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrderLicenseDelivery } from '@/lib/actions/licenseKeys'
import { getOrderDigitalDelivery } from '@/lib/actions/digitalDownloads'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const order = await prisma.order.findFirst({
    where: { id, buyerId: userId },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: { select: { title: true } },
        },
      },
      payment: true,
      returnRequests: {
        include: {
          orderItem: {
            include: {
              product: { select: { name: true, slug: true } },
              variant: { select: { title: true } },
            },
          },
          store: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const licenseDelivery = await getOrderLicenseDelivery(order.id)
  const digitalDelivery = await getOrderDigitalDelivery(order.id)

  return NextResponse.json({
    ...order,
    licenseDelivery,
    digitalDelivery,
  })
}
