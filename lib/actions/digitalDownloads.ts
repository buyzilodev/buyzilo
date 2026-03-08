import { prisma } from '@/lib/prisma'
import { parseProductMeta } from '@/lib/helpers/productMeta'

export type DigitalDownloadRow = {
  name: string
  url: string
  note?: string | null
}

export type OrderDigitalDeliveryRow = {
  productId: string
  productName: string
  orderItemId: string
  variantId?: string | null
  variantLabel?: string | null
  files: DigitalDownloadRow[]
}

function getOrderDigitalDeliveryKey(orderId: string) {
  return `orderDigitalDelivery:${orderId}`
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

async function saveOrderDigitalDelivery(orderId: string, rows: OrderDigitalDeliveryRow[]) {
  await prisma.siteSettings.upsert({
    where: { key: getOrderDigitalDeliveryKey(orderId) },
    update: { value: JSON.stringify(rows) },
    create: { key: getOrderDigitalDeliveryKey(orderId), value: JSON.stringify(rows) },
  })
}

export async function getOrderDigitalDelivery(orderId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getOrderDigitalDeliveryKey(orderId) },
  })
  return parseRows<OrderDigitalDeliveryRow>(row?.value)
}

export async function assignDigitalDownloadsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, title: true } },
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

  const deliveries = order.items.flatMap((item) => {
    const meta = metaMap.get(item.productId)
    const isDigital = (meta?.catalog?.productType ?? 'PHYSICAL') === 'DIGITAL'
    const listingType = meta?.catalog?.listingType ?? 'FOR_SALE'
    const files = (meta?.digitalDownloads ?? []).filter((file) => file?.name && file?.url)

    if (!isDigital || listingType === 'LICENSE_KEYS' || files.length === 0) {
      return []
    }

    return [{
      productId: item.productId,
      productName: item.product.name,
      orderItemId: item.id,
      variantId: item.variantId ?? null,
      variantLabel: item.variant?.title ?? null,
      files: files.map((file) => ({
        name: file.name,
        url: file.url,
        note: file.note ?? null,
      })),
    }]
  })

  if (deliveries.length > 0) {
    await saveOrderDigitalDelivery(order.id, deliveries)
  }

  return deliveries
}
