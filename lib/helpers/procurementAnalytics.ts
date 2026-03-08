type SupplierLike = {
  id: string
  name: string
  store?: { name: string } | null
}

type PurchaseOrderItemLike = {
  quantity: number
  receivedQuantity: number
  unitCost?: number | null
}

type PurchaseOrderLike = {
  status: string
  expectedAt?: string | Date | null
  supplier: { id: string }
  items: PurchaseOrderItemLike[]
}

export function isOpenPurchaseOrder(status: string) {
  return status === 'DRAFT' || status === 'ORDERED'
}

export function isOverduePurchaseOrder(order: Pick<PurchaseOrderLike, 'status' | 'expectedAt'>, now = new Date()) {
  if (!order.expectedAt || order.status === 'RECEIVED' || order.status === 'CANCELLED') {
    return false
  }

  return new Date(order.expectedAt) < now
}

export function getPurchaseOrderOpenCost(order: Pick<PurchaseOrderLike, 'items'>) {
  return order.items.reduce(
    (sum, item) => sum + (item.unitCost ?? 0) * Math.max(0, item.quantity - item.receivedQuantity),
    0
  )
}

export function getPurchaseOrderFillRate(order: Pick<PurchaseOrderLike, 'items'>) {
  const orderedUnits = order.items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0)
  const receivedUnits = order.items.reduce(
    (sum, item) => sum + Math.min(Math.max(0, item.receivedQuantity), Math.max(0, item.quantity)),
    0
  )

  return orderedUnits > 0 ? (receivedUnits / orderedUnits) * 100 : 0
}

export function getSupplierPerformance<TSupplier extends SupplierLike, TOrder extends PurchaseOrderLike>(
  suppliers: TSupplier[],
  purchaseOrders: TOrder[]
) {
  const now = new Date()

  return suppliers
    .map((supplier) => {
      const orders = purchaseOrders.filter((order) => order.supplier.id === supplier.id)
      const committedSpend = orders.reduce((sum, order) => sum + getPurchaseOrderOpenCost(order), 0)
      const overduePurchaseOrders = orders.filter((order) => isOverduePurchaseOrder(order, now)).length
      const unitsOrdered = orders.reduce(
        (sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + Math.max(0, item.quantity), 0),
        0
      )
      const unitsReceived = orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (lineSum, item) => lineSum + Math.min(Math.max(0, item.receivedQuantity), Math.max(0, item.quantity)),
            0
          ),
        0
      )
      const avgFillRate = unitsOrdered > 0 ? (unitsReceived / unitsOrdered) * 100 : 0

      return {
        id: supplier.id,
        name: supplier.name,
        storeName: supplier.store?.name ?? 'Store',
        purchaseOrders: orders.length,
        committedSpend: Number(committedSpend.toFixed(2)),
        overduePurchaseOrders,
        completedPurchaseOrders: orders.filter((order) => order.status === 'RECEIVED').length,
        unitsOrdered,
        unitsReceived,
        avgFillRate: Number(avgFillRate.toFixed(1)),
      }
    })
    .filter((supplier) => supplier.purchaseOrders > 0)
}
