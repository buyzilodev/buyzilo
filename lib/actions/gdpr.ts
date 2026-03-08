import { prisma } from '@/lib/prisma'

export type GdprConsentRecord = {
  policyAccepted: boolean
  marketingConsent: boolean
  analyticsConsent: boolean
  updatedAt: string | null
}

export type GdprDeletionRequestRecord = {
  userId: string
  email: string
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
  reason?: string
  requestedAt: string
  processedAt?: string | null
  processedByUserId?: string | null
  resolutionNote?: string | null
}

const defaultConsent: GdprConsentRecord = {
  policyAccepted: true,
  marketingConsent: false,
  analyticsConsent: true,
  updatedAt: null,
}

function getConsentKey(userId: string) {
  return `gdprConsent:${userId}`
}

function getDeletionRequestKey(userId: string) {
  return `gdprDeletionRequest:${userId}`
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export async function getGdprConsent(userId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getConsentKey(userId) },
  })
  const parsed = parseJson<Partial<GdprConsentRecord>>(row?.value, {})
  return {
    policyAccepted: parsed.policyAccepted ?? defaultConsent.policyAccepted,
    marketingConsent: parsed.marketingConsent ?? defaultConsent.marketingConsent,
    analyticsConsent: parsed.analyticsConsent ?? defaultConsent.analyticsConsent,
    updatedAt: parsed.updatedAt ?? null,
  }
}

export async function updateGdprConsent(userId: string, input: Partial<GdprConsentRecord>) {
  const current = await getGdprConsent(userId)
  const next: GdprConsentRecord = {
    policyAccepted: input.policyAccepted ?? current.policyAccepted,
    marketingConsent: input.marketingConsent ?? current.marketingConsent,
    analyticsConsent: input.analyticsConsent ?? current.analyticsConsent,
    updatedAt: new Date().toISOString(),
  }

  await prisma.siteSettings.upsert({
    where: { key: getConsentKey(userId) },
    update: { value: JSON.stringify(next) },
    create: { key: getConsentKey(userId), value: JSON.stringify(next) },
  })

  return next
}

export async function getGdprDeletionRequest(userId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getDeletionRequestKey(userId) },
  })
  return parseJson<GdprDeletionRequestRecord | null>(row?.value, null)
}

export async function requestGdprDeletion(userId: string, email: string, reason?: string) {
  const record: GdprDeletionRequestRecord = {
    userId,
    email,
    status: 'REQUESTED',
    reason: reason?.trim() || undefined,
    requestedAt: new Date().toISOString(),
    processedAt: null,
    processedByUserId: null,
    resolutionNote: null,
  }

  await prisma.siteSettings.upsert({
    where: { key: getDeletionRequestKey(userId) },
    update: { value: JSON.stringify(record) },
    create: { key: getDeletionRequestKey(userId), value: JSON.stringify(record) },
  })

  return record
}

export async function cancelGdprDeletion(userId: string) {
  const current = await getGdprDeletionRequest(userId)
  if (!current) return null
  const next: GdprDeletionRequestRecord = {
    ...current,
    status: 'CANCELLED',
    processedAt: new Date().toISOString(),
    resolutionNote: current.resolutionNote ?? 'Cancelled by user',
  }
  await prisma.siteSettings.upsert({
    where: { key: getDeletionRequestKey(userId) },
    update: { value: JSON.stringify(next) },
    create: { key: getDeletionRequestKey(userId), value: JSON.stringify(next) },
  })
  return next
}

function anonymizedEmail(userId: string) {
  return `deleted+${userId}@buyzilo.invalid`
}

function anonymizeShippingAddress(value: unknown) {
  const address = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

  return {
    ...address,
    name: 'Deleted User',
    email: null,
    phone: null,
    line1: null,
    line2: null,
    city: null,
    state: null,
    postal_code: null,
    country: address.country ?? null,
  }
}

async function anonymizeUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })
  if (!user) {
    throw new Error('User not found')
  }

  const email = anonymizedEmail(userId)
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    select: { id: true, shippingAddress: true },
  })

  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          buyerId: null,
          buyerEmail: email,
          shippingAddress: anonymizeShippingAddress(order.shippingAddress),
          shippingAddressId: null,
        },
      })
    }

    await tx.supportRequest.updateMany({
      where: { userId },
      data: {
        userId: null,
        subject: 'Deleted user request',
        message: '[deleted]',
      },
    })

    await tx.returnRequest.updateMany({
      where: { userId },
      data: {
        userId: null,
        details: '[deleted]',
      },
    })

    await tx.message.updateMany({
      where: { senderId: userId },
      data: { senderId: null },
    })

    await tx.blogComment.updateMany({
      where: { userId },
      data: {
        userId: null,
        authorName: 'Deleted User',
        authorEmail: email,
      },
    })

    await tx.review.deleteMany({ where: { userId } })
    await tx.address.deleteMany({ where: { userId } })
    await tx.wishlistItem.deleteMany({ where: { userId } })
    await tx.productSubscription.deleteMany({ where: { userId } })
    await tx.stockAlert.deleteMany({ where: { userId } })
    await tx.cart.deleteMany({ where: { userId } })
    await tx.session.deleteMany({ where: { userId } })
    await tx.account.deleteMany({ where: { userId } })
    await tx.userGroupMembership.deleteMany({ where: { userId } })

    await tx.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email,
        image: null,
        password: null,
        emailVerified: null,
        permissions: [],
        role: 'BUYER',
      },
    })

    await tx.siteSettings.deleteMany({
      where: {
        OR: [
          { key: getConsentKey(userId) },
          { key: `notificationPreferences:${userId}` },
          { key: `savedSearches:${userId}` },
          { key: `retentionNotifications:${userId}` },
          { key: `storeCredit:${userId}` },
          { key: `rewards:${userId}` },
          { key: `referrals:${userId}` },
          { key: `referredBy:${userId}` },
        ],
      },
    })
  })
}

export async function getAdminGdprDeletionRequests() {
  const rows = await prisma.siteSettings.findMany({
    where: {
      key: {
        startsWith: 'gdprDeletionRequest:',
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return rows
    .map((row) => parseJson<GdprDeletionRequestRecord | null>(row.value, null))
    .filter((row): row is GdprDeletionRequestRecord => Boolean(row))
}

export async function processGdprDeletionRequest(input: {
  userId: string
  actorId: string
  action: 'APPROVE' | 'REJECT'
  resolutionNote?: string
}) {
  const current = await getGdprDeletionRequest(input.userId)
  if (!current) {
    throw new Error('Deletion request not found')
  }

  if (input.action === 'APPROVE') {
    await anonymizeUserData(input.userId)
  }

  const next: GdprDeletionRequestRecord = {
    ...current,
    status: input.action === 'APPROVE' ? 'COMPLETED' : 'REJECTED',
    processedAt: new Date().toISOString(),
    processedByUserId: input.actorId,
    resolutionNote: input.resolutionNote?.trim() || (input.action === 'APPROVE' ? 'User data anonymized' : 'Request rejected'),
  }

  await prisma.siteSettings.upsert({
    where: { key: getDeletionRequestKey(input.userId) },
    update: { value: JSON.stringify(next) },
    create: { key: getDeletionRequestKey(input.userId), value: JSON.stringify(next) },
  })

  return next
}

export async function exportUserPersonalData(userId: string) {
  const [
    user,
    wishlistItems,
    subscriptions,
    alerts,
    supportRequests,
    returnRequests,
    orders,
    reviews,
    addresses,
    siteSettings,
    consent,
    deletionRequest,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productSubscription.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockAlert.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supportRequest.findMany({
      where: { userId },
      include: {
        store: { select: { id: true, name: true } },
        order: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, title: true } },
          },
        },
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.findMany({
      where: { userId },
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.siteSettings.findMany({
      where: {
        key: {
          in: [
            `notificationPreferences:${userId}`,
            `savedSearches:${userId}`,
            `retentionNotifications:${userId}`,
            `storeCredit:${userId}`,
            `rewards:${userId}`,
            `referrals:${userId}`,
            `referredBy:${userId}`,
          ],
        },
      },
    }),
    getGdprConsent(userId),
    getGdprDeletionRequest(userId),
  ])

  return {
    exportedAt: new Date().toISOString(),
    user,
    privacy: {
      consent,
      deletionRequest,
    },
    addresses,
    orders,
    reviews,
    wishlistItems,
    subscriptions,
    alerts,
    supportRequests,
    returnRequests,
    settings: Object.fromEntries(siteSettings.map((row) => [row.key, parseJson(row.value, row.value)])),
  }
}
