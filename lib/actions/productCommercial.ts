import { prisma } from '@/lib/prisma'
import { parseProductMeta } from '@/lib/helpers/productMeta'
import { dispatchZapierEvent } from '@/lib/actions/zapier'

export type QuoteRequestStatus = 'NEW' | 'RESPONDED' | 'CLOSED'

export type QuoteRequestRecord = {
  id: string
  productId: string
  productName: string
  productSlug: string
  storeId: string | null
  storeName: string | null
  variantId?: string | null
  variantLabel?: string | null
  userId?: string | null
  buyerName: string
  buyerEmail: string
  buyerPhone?: string | null
  message: string
  status: QuoteRequestStatus
  source: 'AUTHENTICATED' | 'GUEST'
  responseMessage?: string | null
  responsePrice?: number | null
  responseByUserId?: string | null
  respondedAt?: string | null
  createdAt: string
  updatedAt: string
}

function getQuoteRequestKey(id: string) {
  return `quoteRequest:${id}`
}

export function parseQuoteRequest(rowValue: string | null | undefined) {
  if (!rowValue) return null
  try {
    const parsed = JSON.parse(rowValue) as QuoteRequestRecord
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

async function saveQuoteRequest(record: QuoteRequestRecord) {
  await prisma.siteSettings.upsert({
    where: { key: getQuoteRequestKey(record.id) },
    update: { value: JSON.stringify(record) },
    create: {
      key: getQuoteRequestKey(record.id),
      value: JSON.stringify(record),
    },
  })
}

async function readQuoteRequest(id: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getQuoteRequestKey(id) },
  })
  return parseQuoteRequest(row?.value)
}

async function readAllQuoteRequests() {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'quoteRequest:' } },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  })

  return rows
    .map((row) => parseQuoteRequest(row.value))
    .filter((row): row is QuoteRequestRecord => Boolean(row))
    .sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1))
}

export async function createQuoteRequest(input: {
  productId: string
  variantId?: string | null
  message: string
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  userId?: string | null
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: {
      store: { select: { id: true, name: true, status: true } },
      variants: { select: { id: true, title: true } },
    },
  })

  if (!product || !product.isActive || product.approvalStatus !== 'APPROVED') {
    throw new Error('Product not found')
  }

  const metaRow = await prisma.siteSettings.findUnique({
    where: { key: `productMeta:${product.id}` },
    select: { value: true },
  })
  const meta = parseProductMeta(metaRow?.value)
  if ((meta.catalog?.listingType ?? 'FOR_SALE') !== 'QUOTE_REQUEST') {
    throw new Error('This product is not configured for quote requests')
  }

  let buyerName = input.buyerName?.trim() ?? ''
  let buyerEmail = input.buyerEmail?.trim().toLowerCase() ?? ''
  if (input.userId) {
    const buyer = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true },
    })
    buyerName = buyerName || buyer?.name?.trim() || 'Buyzilo buyer'
    buyerEmail = buyerEmail || buyer?.email?.trim().toLowerCase() || ''
  }

  if (!buyerName || !buyerEmail) {
    throw new Error('Buyer name and email are required')
  }

  const variant = input.variantId
    ? product.variants.find((item) => item.id === input.variantId)
    : null
  if (input.variantId && !variant) {
    throw new Error('Selected variant not found')
  }

  const now = new Date().toISOString()
  const record: QuoteRequestRecord = {
    id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    storeId: product.storeId,
    storeName: product.store?.name ?? null,
    variantId: variant?.id ?? null,
    variantLabel: variant?.title ?? null,
    userId: input.userId ?? null,
    buyerName,
    buyerEmail,
    buyerPhone: input.buyerPhone?.trim() || null,
    message: input.message.trim(),
    status: 'NEW',
    source: input.userId ? 'AUTHENTICATED' : 'GUEST',
    responseMessage: null,
    responsePrice: null,
    responseByUserId: null,
    respondedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  await saveQuoteRequest(record)

  try {
    await dispatchZapierEvent('quote.requested', {
      quoteRequestId: record.id,
      productId: record.productId,
      productSlug: record.productSlug,
      storeId: record.storeId,
      variantId: record.variantId,
      userId: record.userId,
      buyerEmail: record.buyerEmail,
      status: record.status,
    })
  } catch (error) {
    console.warn('Zapier quote.requested failed:', error)
  }

  return record
}

export async function listBuyerQuoteRequests(userId: string) {
  const requests = await readAllQuoteRequests()
  return requests.filter((request) => request.userId === userId)
}

export async function listVendorQuoteRequests(vendorUserId: string) {
  const store = await prisma.store.findUnique({
    where: { vendorId: vendorUserId },
    select: { id: true, name: true },
  })

  if (!store) {
    return { store: null, requests: [] as QuoteRequestRecord[] }
  }

  const requests = await readAllQuoteRequests()
  return {
    store,
    requests: requests.filter((request) => request.storeId === store.id),
  }
}

export async function listAdminQuoteRequests() {
  return readAllQuoteRequests()
}

export async function updateQuoteRequest(input: {
  id: string
  actorUserId?: string | null
  status?: QuoteRequestStatus
  responseMessage?: string
  responsePrice?: number | null
}) {
  const existing = await readQuoteRequest(input.id)
  if (!existing) {
    throw new Error('Quote request not found')
  }

  const nextStatus =
    input.status ??
    (input.responseMessage?.trim() || input.responsePrice != null ? 'RESPONDED' : existing.status)

  const nextRecord: QuoteRequestRecord = {
    ...existing,
    status: nextStatus,
    responseMessage:
      input.responseMessage !== undefined ? input.responseMessage.trim() || null : existing.responseMessage ?? null,
    responsePrice:
      input.responsePrice !== undefined && input.responsePrice !== null && Number.isFinite(Number(input.responsePrice))
        ? Number(input.responsePrice)
        : input.responsePrice === null
          ? null
          : existing.responsePrice ?? null,
    responseByUserId: input.actorUserId ?? existing.responseByUserId ?? null,
    respondedAt:
      nextStatus === 'RESPONDED'
        ? new Date().toISOString()
        : nextStatus === 'CLOSED'
          ? existing.respondedAt ?? new Date().toISOString()
          : existing.respondedAt ?? null,
    updatedAt: new Date().toISOString(),
  }

  await saveQuoteRequest(nextRecord)

  try {
    await dispatchZapierEvent('quote.updated', {
      quoteRequestId: nextRecord.id,
      productId: nextRecord.productId,
      storeId: nextRecord.storeId,
      status: nextRecord.status,
      responsePrice: nextRecord.responsePrice,
    })
  } catch (error) {
    console.warn('Zapier quote.updated failed:', error)
  }

  return nextRecord
}
