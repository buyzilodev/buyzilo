import { prisma } from '@/lib/prisma'

export async function getVendorStoreByUserId(userId: string) {
  return prisma.store.findUnique({
    where: { vendorId: userId },
  })
}

export async function getVendorOverview(userId: string) {
  const store = await getVendorStoreByUserId(userId)
  if (!store) {
    return null
  }

  const [productCount, activeProductCount, orderItems] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.product.count({ where: { storeId: store.id, isActive: true, approvalStatus: 'APPROVED' } }),
    prisma.orderItem.findMany({
      where: { product: { storeId: store.id } },
      include: { order: { select: { status: true, createdAt: true } } },
    }),
  ])

  const totalSales = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    store,
    productCount,
    activeProductCount,
    orderCount: new Set(orderItems.map((item) => item.orderId)).size,
    totalSales,
  }
}
