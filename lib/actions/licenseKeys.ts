import { prisma } from '@/lib/prisma'
import { parseProductMeta } from '@/lib/helpers/productMeta'
import { buildSelectionKey } from '@/lib/helpers/productVariants'

export type LicenseKeyInventoryRow = {
  id: string
  code: string
  note?: string | null
  variantKey?: string | null
  variantLabel?: string | null
  isActive: boolean
  createdAt: string
  assignedOrderId?: string | null
  assignedOrderItemId?: string | null
  assignedAt?: string | null
}

export type LicenseDeliveryRow = {
  productId: string
  productName: string
  orderItemId: string
  variantId?: string | null
  variantLabel?: string | null
  codes: Array<{
    code: string
    note?: string | null
  }>
}

function getLicenseInventoryKey(productId: string) {
  return `productLicenseInventory:${productId}`
}

function getLicenseDeliveryKey(orderId: string) {
  return `orderLicenseDelivery:${orderId}`
}

function parseRows<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function getProductLicenseInventory(productId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getLicenseInventoryKey(productId) },
  })
  return parseRows<LicenseKeyInventoryRow>(row?.value)
}

async function saveProductLicenseInventoryRows(productId: string, rows: LicenseKeyInventoryRow[]) {
  await prisma.siteSettings.upsert({
    where: { key: getLicenseInventoryKey(productId) },
    update: { value: JSON.stringify(rows) },
    create: { key: getLicenseInventoryKey(productId), value: JSON.stringify(rows) },
  })
}

export async function saveProductLicenseInventory(
  productId: string,
  rows: Array<{
    id?: string
    code: string
    note?: string | null
    variantKey?: string | null
    variantLabel?: string | null
    isActive?: boolean
  }>
) {
  const existing = await getProductLicenseInventory(productId)
  const assignedRows = existing.filter((row) => row.assignedOrderId)
  const nextAvailableRows: LicenseKeyInventoryRow[] = rows
    .filter((row) => row.code.trim())
    .map((row) => {
      const existingRow = row.id ? existing.find((item) => item.id === row.id) : null
      return {
        id: row.id || `lkey_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        code: row.code.trim(),
        note: row.note?.trim() || null,
        variantKey: row.variantKey?.trim() || null,
        variantLabel: row.variantLabel?.trim() || null,
        isActive: row.isActive !== false,
        createdAt: existingRow?.createdAt ?? new Date().toISOString(),
        assignedOrderId: null,
        assignedOrderItemId: null,
        assignedAt: null,
      }
    })

  await saveProductLicenseInventoryRows(productId, [...nextAvailableRows, ...assignedRows])
}

export async function getOrderLicenseDelivery(orderId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getLicenseDeliveryKey(orderId) },
  })
  return parseRows<LicenseDeliveryRow>(row?.value)
}

async function saveOrderLicenseDelivery(orderId: string, rows: LicenseDeliveryRow[]) {
  await prisma.siteSettings.upsert({
    where: { key: getLicenseDeliveryKey(orderId) },
    update: { value: JSON.stringify(rows) },
    create: { key: getLicenseDeliveryKey(orderId), value: JSON.stringify(rows) },
  })
}

export async function reconcileLicenseInventoryStock(productId: string) {
  const [inventory, product, metaRow] = await Promise.all([
    getProductLicenseInventory(productId),
    prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    }),
    prisma.siteSettings.findUnique({
      where: { key: `productMeta:${productId}` },
      select: { value: true },
    }),
  ])

  if (!product) {
    return { productStock: 0, variantStocks: new Map<string, number>() }
  }

  const meta = parseProductMeta(metaRow?.value)
  if ((meta.catalog?.listingType ?? 'FOR_SALE') !== 'LICENSE_KEYS') {
    return { productStock: product.stock, variantStocks: new Map<string, number>() }
  }

  const available = inventory.filter((row) => row.isActive && !row.assignedOrderId)
  const variantStocks = new Map<string, number>()
  for (const variant of product.variants) {
    const variantKey = buildSelectionKey(variant.selectedOptions as Record<string, string>)
    const count = available.filter((row) => (row.variantKey ?? null) === variantKey).length
    variantStocks.set(variant.id, count)
  }

  const totalStock = product.variants.length > 0
    ? Array.from(variantStocks.values()).reduce((sum, value) => sum + value, 0)
    : available.filter((row) => !row.variantKey).length

  await prisma.product.update({
    where: { id: productId },
    data: { stock: totalStock },
  })

  for (const variant of product.variants) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: variantStocks.get(variant.id) ?? 0 },
    })
  }

  return { productStock: totalStock, variantStocks }
}

export async function assignLicenseKeysForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, title: true, selectedOptions: true } },
        },
      },
    },
  })

  if (!order) {
    return []
  }

  const metaRows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: order.items.map((item) => `productMeta:${item.productId}`),
      },
    },
  })
  const metaMap = new Map(
    metaRows.map((row) => [row.key.replace('productMeta:', ''), parseProductMeta(row.value)]),
  )

  const deliveries: LicenseDeliveryRow[] = []

  for (const item of order.items) {
    const meta = metaMap.get(item.productId)
    if ((meta?.catalog?.listingType ?? 'FOR_SALE') !== 'LICENSE_KEYS') {
      continue
    }

    const inventory = await getProductLicenseInventory(item.productId)
    const variantKey = item.variant ? buildSelectionKey(item.variant.selectedOptions as Record<string, string>) : null
    const matchingPool = inventory.filter((row) => {
      if (!row.isActive || row.assignedOrderId) return false
      if (variantKey) return (row.variantKey ?? null) === variantKey
      return !row.variantKey
    })

    if (matchingPool.length < item.quantity) {
      throw new Error(`Not enough license keys available for ${item.product.name}`)
    }

    const assigned = matchingPool.slice(0, item.quantity).map((row) => ({
      ...row,
      assignedOrderId: order.id,
      assignedOrderItemId: item.id,
      assignedAt: new Date().toISOString(),
    }))

    const assignedIdSet = new Set(assigned.map((row) => row.id))
    const nextInventory = inventory.map((row) => assignedIdSet.has(row.id) ? assigned.find((itemRow) => itemRow.id === row.id)! : row)
    await saveProductLicenseInventoryRows(item.productId, nextInventory)

    deliveries.push({
      productId: item.productId,
      productName: item.product.name,
      orderItemId: item.id,
      variantId: item.variantId ?? null,
      variantLabel: item.variant?.title ?? null,
      codes: assigned.map((row) => ({
        code: row.code,
        note: row.note ?? null,
      })),
    })

    await reconcileLicenseInventoryStock(item.productId)
  }

  if (deliveries.length > 0) {
    await saveOrderLicenseDelivery(order.id, deliveries)
  }

  return deliveries
}
