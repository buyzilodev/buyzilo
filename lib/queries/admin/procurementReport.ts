import { prisma } from '@/lib/prisma'
import {
  getPurchaseOrderFillRate,
  getPurchaseOrderOpenCost,
  getSupplierPerformance,
  isOverduePurchaseOrder,
} from '@/lib/helpers/procurementAnalytics'

export type AdminProcurementReportData = {
  stats: {
    suppliers: number
    purchaseOrders: number
    overduePurchaseOrders: number
    committedSpend: number
    receivedSpend: number
    avgFillRate: number
  }
  monthlySpend: Array<{
    month: string
    committed: number
    received: number
  }>
  monthlyOperations: Array<{
    month: string
    ordered: number
    overdue: number
  }>
  supplierScorecards: Array<{
    id: string
    name: string
    storeName: string
    purchaseOrders: number
    committedSpend: number
    overduePurchaseOrders: number
    completedPurchaseOrders: number
    unitsOrdered: number
    unitsReceived: number
    avgFillRate: number
  }>
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' })
}

export async function getAdminProcurementReportData(): Promise<AdminProcurementReportData> {
  const now = new Date()
  const sevenMonthsAgo = new Date(now)
  sevenMonthsAgo.setMonth(now.getMonth() - 6)

  const [suppliers, purchaseOrders] = await Promise.all([
    prisma.supplier.findMany({
      include: {
        store: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: sevenMonthsAgo } },
      include: {
        store: { select: { name: true } },
        supplier: { select: { id: true, name: true } },
        items: {
          select: {
            quantity: true,
            receivedQuantity: true,
            unitCost: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const monthlySpendMap = new Map<string, { committed: number; received: number }>()
  const monthlyOperationsMap = new Map<string, { ordered: number; overdue: number }>()
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setMonth(now.getMonth() - i)
    const label = monthLabel(date)
    monthlySpendMap.set(label, { committed: 0, received: 0 })
    monthlyOperationsMap.set(label, { ordered: 0, overdue: 0 })
  }

  let receivedSpend = 0
  let fillRateTotal = 0

  for (const purchaseOrder of purchaseOrders) {
    const label = monthLabel(purchaseOrder.createdAt)
    const spendEntry = monthlySpendMap.get(label)
    const opsEntry = monthlyOperationsMap.get(label)
    const openCost = getPurchaseOrderOpenCost(purchaseOrder)
    const receivedCost = purchaseOrder.items.reduce(
      (sum, item) => sum + (item.unitCost ?? 0) * Math.min(item.quantity, item.receivedQuantity),
      0
    )

    if (spendEntry) {
      spendEntry.committed += openCost
      spendEntry.received += receivedCost
    }
    if (opsEntry) {
      opsEntry.ordered += 1
      if (isOverduePurchaseOrder(purchaseOrder, now)) {
        opsEntry.overdue += 1
      }
    }

    receivedSpend += receivedCost
    fillRateTotal += getPurchaseOrderFillRate(purchaseOrder)
  }

  const supplierScorecards = getSupplierPerformance(suppliers, purchaseOrders).sort((left, right) => {
    if (right.committedSpend !== left.committedSpend) {
      return right.committedSpend - left.committedSpend
    }
    return right.purchaseOrders - left.purchaseOrders
  })

  return {
    stats: {
      suppliers: suppliers.length,
      purchaseOrders: purchaseOrders.length,
      overduePurchaseOrders: purchaseOrders.filter((order) => isOverduePurchaseOrder(order, now)).length,
      committedSpend: Number(purchaseOrders.reduce((sum, order) => sum + getPurchaseOrderOpenCost(order), 0).toFixed(2)),
      receivedSpend: Number(receivedSpend.toFixed(2)),
      avgFillRate: Number((purchaseOrders.length > 0 ? fillRateTotal / purchaseOrders.length : 0).toFixed(1)),
    },
    monthlySpend: Array.from(monthlySpendMap.entries()).map(([month, value]) => ({
      month,
      committed: Number(value.committed.toFixed(2)),
      received: Number(value.received.toFixed(2)),
    })),
    monthlyOperations: Array.from(monthlyOperationsMap.entries()).map(([month, value]) => ({
      month,
      ordered: value.ordered,
      overdue: value.overdue,
    })),
    supplierScorecards,
  }
}
