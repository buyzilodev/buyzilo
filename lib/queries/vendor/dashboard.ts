import { prisma } from '@/lib/prisma'
import { getVendorCategoryFeeMap } from '@/lib/actions/vendorCategoryFees'

export async function getVendorStoreByUserId(userId: string) {
  return prisma.store.findUnique({
    where: { vendorId: userId },
  })
}

export async function getVendorOverviewData(userId: string) {
  const store = await getVendorStoreByUserId(userId)
  if (!store) return null

  const [products, orderItems, overdueProcurement, procurementAlertThreads] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id },
      select: { id: true, approvalStatus: true, isActive: true },
    }),
    prisma.orderItem.findMany({
      where: { product: { storeId: store.id } },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            buyer: { select: { name: true, email: true } },
          },
        },
        product: {
          select: { name: true, categoryId: true },
        },
      },
      orderBy: { order: { createdAt: 'desc' } },
    }),
    prisma.purchaseOrder.count({
      where: {
        storeId: store.id,
        expectedAt: { lt: new Date() },
        status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    }),
    prisma.messageThread.count({
      where: {
        category: 'PROCUREMENT_ALERT',
        participants: {
          some: { userId },
        },
      },
    }),
  ])
  const categoryFeeMap = await getVendorCategoryFeeMap()

  const byOrder = new Map<string, {
    id: string
    status: string
    createdAt: Date
    buyer: { name: string | null; email: string } | null
    total: number
    items: Array<{ name: string; quantity: number }>
  }>()

  orderItems.forEach((item) => {
    if (!byOrder.has(item.orderId)) {
      byOrder.set(item.orderId, {
        id: item.order.id,
        status: item.order.status,
        createdAt: item.order.createdAt,
        buyer: item.order.buyer,
        total: 0,
        items: [],
      })
    }
    const row = byOrder.get(item.orderId)!
    row.total += item.price * item.quantity
    row.items.push({ name: item.product.name, quantity: item.quantity })
  })

  const orders = Array.from(byOrder.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
  const categoryFeeExposure = orderItems.reduce((sum, item) => {
    const feePercent = categoryFeeMap.get(item.product.categoryId) ?? 0
    return sum + item.price * item.quantity * (feePercent / 100)
  }, 0)
  const productCount = products.length
  const approvedProductCount = products.filter((product) => product.approvalStatus === 'APPROVED').length
  const pendingProductCount = products.filter((product) => product.approvalStatus === 'PENDING').length

  return {
    store,
    orders,
    totalSales,
    orderCount: orders.length,
    productCount,
    approvedProductCount,
    pendingProductCount,
    overdueProcurement,
    procurementAlertThreads,
    categoryFeeExposure: Number(categoryFeeExposure.toFixed(2)),
  }
}

export async function getVendorOrdersData(userId: string) {
  const overview = await getVendorOverviewData(userId)
  if (!overview) return null
  return {
    store: overview.store,
    orders: overview.orders,
  }
}

export async function getVendorProductsData(userId: string) {
  const store = await getVendorStoreByUserId(userId)
  if (!store) return null

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return { store, products }
}
