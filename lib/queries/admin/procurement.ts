import { prisma } from '@/lib/prisma'
import {
  getPurchaseOrderOpenCost,
  getSupplierPerformance,
  isOpenPurchaseOrder,
  isOverduePurchaseOrder,
} from '@/lib/helpers/procurementAnalytics'

export type AdminProcurementData = {
  stats: {
    suppliers: number
    openPurchaseOrders: number
    partiallyReceived: number
    fullyReceived: number
    overduePurchaseOrders: number
    committedSpend: number
  }
  supplierSpend: Array<{
    id: string
    name: string
    storeName: string
    committedSpend: number
    purchaseOrders: number
    overduePurchaseOrders: number
    completedPurchaseOrders: number
    unitsOrdered: number
    unitsReceived: number
    avgFillRate: number
  }>
  purchaseOrders: Array<{
    id: string
    status: string
    expectedAt?: Date | null
    note?: string | null
    createdAt: Date
    store: { id: string; name: string; slug: string }
    supplier: { id: string; name: string; email?: string | null; phone?: string | null }
    warehouse: { id: string; name: string; code?: string | null }
    items: Array<{
      id: string
      quantity: number
      receivedQuantity: number
      unitCost?: number | null
      product: { id: string; name: string }
      variant?: { id: string; title: string } | null
    }>
  }>
}

export async function getAdminProcurementData(): Promise<AdminProcurementData> {
  const [suppliers, purchaseOrders] = await Promise.all([
    prisma.supplier.count(),
    prisma.purchaseOrder.findMany({
      include: {
        store: { select: { id: true, name: true, slug: true } },
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
    }),
  ])

  const now = new Date()
  const overduePurchaseOrders = purchaseOrders.filter((po) => isOverduePurchaseOrder(po, now))
  const committedSpend = purchaseOrders.reduce((sum, po) => sum + getPurchaseOrderOpenCost(po), 0)
  const supplierAgg = getSupplierPerformance(
    Array.from(
      new Map(
        purchaseOrders.map((po) => [
          po.supplier.id,
          {
            id: po.supplier.id,
            name: po.supplier.name,
            store: { name: po.store.name },
          },
        ])
      ).values()
    ),
    purchaseOrders
  )

  return {
    stats: {
      suppliers,
      openPurchaseOrders: purchaseOrders.filter((po) => isOpenPurchaseOrder(po.status)).length,
      partiallyReceived: purchaseOrders.filter((po) => po.status === 'PARTIALLY_RECEIVED').length,
      fullyReceived: purchaseOrders.filter((po) => po.status === 'RECEIVED').length,
      overduePurchaseOrders: overduePurchaseOrders.length,
      committedSpend: Number(committedSpend.toFixed(2)),
    },
    supplierSpend: supplierAgg
      .sort((left, right) => right.committedSpend - left.committedSpend)
      .slice(0, 10),
    purchaseOrders,
  }
}
