import { prisma } from '@/lib/prisma'
import { pushRetentionNotification } from '@/lib/actions/retentionNotifications'
import { sendGiftCertificateEmail } from '@/lib/email'

type StoreCreditEntry = {
  id: string
  type: 'GIFT_CARD_REDEEMED' | 'ADMIN_CREDIT' | 'CHECKOUT_APPLIED' | 'EXPIRED'
  amount: number
  note?: string
  createdAt: string
  giftCardCode?: string
  expiresAt?: string | null
  remainingAmount?: number
}

type StoreCreditLedger = {
  balance: number
  entries: StoreCreditEntry[]
}

export type StoreCreditProgramConfig = {
  expiryDays: number | null
  expiringSoonDays: number
}

type GiftCardDeliveryStatus = 'PENDING' | 'SENT'

export type GiftCardRecord = {
  code: string
  amount: number
  remainingAmount: number
  note?: string
  createdAt: string
  expiresAt: string | null
  issuedByUserId?: string
  redeemedByUserId?: string | null
  redeemedAt?: string | null
  isActive: boolean
  purchaserUserId?: string | null
  senderName?: string | null
  recipientName?: string | null
  recipientEmail?: string | null
  personalMessage?: string | null
  source?: 'ADMIN' | 'BUYER_BALANCE'
  deliveryStatus?: GiftCardDeliveryStatus
  deliveredAt?: string | null
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function getStoreCreditKey(userId: string) {
  return `storeCredit:${userId}`
}

function getGiftCardKey(code: string) {
  return `giftCard:${code.toUpperCase()}`
}

function createGiftCardCode() {
  return `GIFT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

const defaultStoreCreditProgramConfig: StoreCreditProgramConfig = {
  expiryDays: 365,
  expiringSoonDays: 30,
}

export async function getStoreCreditProgramConfig(): Promise<StoreCreditProgramConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'storeCreditProgramConfig' },
  })

  if (!row?.value) {
    return defaultStoreCreditProgramConfig
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<StoreCreditProgramConfig>
    return {
      expiryDays: typeof parsed.expiryDays === 'number' ? parsed.expiryDays : defaultStoreCreditProgramConfig.expiryDays,
      expiringSoonDays:
        typeof parsed.expiringSoonDays === 'number'
          ? parsed.expiringSoonDays
          : defaultStoreCreditProgramConfig.expiringSoonDays,
    }
  } catch {
    return defaultStoreCreditProgramConfig
  }
}

function getExpiryDate(expiryDays: number | null) {
  if (expiryDays == null || expiryDays <= 0) {
    return null
  }
  return new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
}

async function getStoreCreditLedger(userId: string): Promise<StoreCreditLedger> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getStoreCreditKey(userId) },
  })

  if (!row?.value) {
    return { balance: 0, entries: [] }
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<StoreCreditLedger>
    return {
      balance: typeof parsed.balance === 'number' ? roundMoney(parsed.balance) : 0,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    }
  } catch {
    return { balance: 0, entries: [] }
  }
}

async function saveStoreCreditLedger(userId: string, ledger: StoreCreditLedger) {
  await prisma.siteSettings.upsert({
    where: { key: getStoreCreditKey(userId) },
    update: { value: JSON.stringify(ledger) },
    create: { key: getStoreCreditKey(userId), value: JSON.stringify(ledger) },
  })
}

async function normalizeStoreCreditLedger(userId: string, ledger: StoreCreditLedger) {
  const now = new Date()
  let changed = false

  for (const entry of ledger.entries) {
    if (entry.type === 'CHECKOUT_APPLIED' || entry.type === 'EXPIRED') {
      continue
    }
    if (entry.remainingAmount == null) {
      entry.remainingAmount = entry.amount
      changed = true
    }
    if (entry.expiresAt === undefined) {
      entry.expiresAt = null
      changed = true
    }
    if (entry.remainingAmount > 0 && entry.expiresAt && new Date(entry.expiresAt) < now) {
      const expiredAmount = roundMoney(entry.remainingAmount)
      ledger.balance = roundMoney(Math.max(0, ledger.balance - expiredAmount))
      ledger.entries.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'EXPIRED',
        amount: -expiredAmount,
        note: `Expired credit from ${entry.type.replaceAll('_', ' ').toLowerCase()}`,
        createdAt: new Date().toISOString(),
      })
      entry.remainingAmount = 0
      changed = true
    }
  }

  if (changed) {
    ledger.entries = ledger.entries.slice(0, 80)
    await saveStoreCreditLedger(userId, ledger)
  }

  return ledger
}

async function getGiftCardRecord(code: string): Promise<GiftCardRecord | null> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getGiftCardKey(code) },
  })
  if (!row?.value) return null
  try {
    return JSON.parse(row.value) as GiftCardRecord
  } catch {
    return null
  }
}

async function saveGiftCardRecord(record: GiftCardRecord) {
  await prisma.siteSettings.upsert({
    where: { key: getGiftCardKey(record.code) },
    update: { value: JSON.stringify(record) },
    create: { key: getGiftCardKey(record.code), value: JSON.stringify(record) },
  })
}

async function maybeSendGiftCertificateDelivery(record: GiftCardRecord) {
  if (!record.recipientEmail) {
    return record
  }

  try {
    await sendGiftCertificateEmail({
      to: record.recipientEmail,
      recipientName: record.recipientName || 'Recipient',
      senderName: record.senderName || 'Buyzilo customer',
      code: record.code,
      amount: record.amount,
      message: record.personalMessage || undefined,
      expiresAt: record.expiresAt,
    })
    const nextRecord: GiftCardRecord = {
      ...record,
      deliveryStatus: 'SENT',
      deliveredAt: new Date().toISOString(),
    }
    await saveGiftCardRecord(nextRecord)
    return nextRecord
  } catch (error) {
    console.warn('Gift certificate email failed:', error)
    return record
  }
}

export async function listUserGiftCertificates(userId: string) {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'giftCard:' } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  const certificates = rows.flatMap((row) => {
    try {
      return [JSON.parse(row.value) as GiftCardRecord]
    } catch {
      return []
    }
  })

  return {
    purchased: certificates.filter((card) => card.purchaserUserId === userId).slice(0, 25),
    redeemed: certificates.filter((card) => card.redeemedByUserId === userId).slice(0, 25),
  }
}

export async function getStoreCreditSummary(userId: string) {
  const config = await getStoreCreditProgramConfig()
  const ledger = await normalizeStoreCreditLedger(userId, await getStoreCreditLedger(userId))
  const now = new Date()
  const expiringCutoff = new Date(Date.now() + config.expiringSoonDays * 24 * 60 * 60 * 1000)
  const expiringSoonBalance = ledger.entries.reduce((sum, entry) => {
    if (!entry.expiresAt || !entry.remainingAmount || entry.remainingAmount <= 0) {
      return sum
    }
    const expiryDate = new Date(entry.expiresAt)
    if (expiryDate < now || expiryDate > expiringCutoff) {
      return sum
    }
    return sum + entry.remainingAmount
  }, 0)
  return {
    balance: ledger.balance,
    expiringSoonBalance: roundMoney(expiringSoonBalance),
    expiryDays: config.expiryDays,
    expiringSoonDays: config.expiringSoonDays,
    entries: ledger.entries.slice(0, 20),
  }
}

export async function issueGiftCard(input: {
  amount: number
  note?: string
  expiresAt?: string | null
  issuedByUserId?: string
  purchaserUserId?: string | null
  senderName?: string | null
  recipientName?: string | null
  recipientEmail?: string | null
  personalMessage?: string | null
  source?: 'ADMIN' | 'BUYER_BALANCE'
  deliverNow?: boolean
}) {
  const amount = roundMoney(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Gift card amount must be greater than zero')
  }
  let record: GiftCardRecord = {
    code: createGiftCardCode(),
    amount,
    remainingAmount: amount,
    note: input.note,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt ?? null,
    issuedByUserId: input.issuedByUserId,
    redeemedByUserId: null,
    redeemedAt: null,
    isActive: true,
    purchaserUserId: input.purchaserUserId ?? null,
    senderName: input.senderName ?? null,
    recipientName: input.recipientName ?? null,
    recipientEmail: input.recipientEmail ?? null,
    personalMessage: input.personalMessage ?? null,
    source: input.source ?? 'ADMIN',
    deliveryStatus: input.recipientEmail ? 'PENDING' : 'SENT',
    deliveredAt: null,
  }
  await saveGiftCardRecord(record)
  if (input.deliverNow && record.recipientEmail) {
    record = await maybeSendGiftCertificateDelivery(record)
  }
  return record
}

export async function redeemGiftCard(userId: string, code: string) {
  const config = await getStoreCreditProgramConfig()
  const record = await getGiftCardRecord(code)
  if (!record || !record.isActive) {
    throw new Error('Invalid gift card')
  }
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    throw new Error('Gift card expired')
  }
  if (record.redeemedByUserId) {
    throw new Error('Gift card already redeemed')
  }
  if (record.remainingAmount <= 0) {
    throw new Error('Gift card has no balance')
  }

  const ledger = await normalizeStoreCreditLedger(userId, await getStoreCreditLedger(userId))
  ledger.balance = roundMoney(ledger.balance + record.remainingAmount)
  ledger.entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'GIFT_CARD_REDEEMED',
    amount: record.remainingAmount,
    note: record.note,
    createdAt: new Date().toISOString(),
    giftCardCode: record.code,
    expiresAt: getExpiryDate(config.expiryDays),
    remainingAmount: record.remainingAmount,
  })
  ledger.entries = ledger.entries.slice(0, 50)
  await saveStoreCreditLedger(userId, ledger)

  record.redeemedByUserId = userId
  record.redeemedAt = new Date().toISOString()
  record.remainingAmount = 0
  await saveGiftCardRecord(record)

  await pushRetentionNotification({
    userId,
    kind: 'STORE_CREDIT',
    title: 'Gift card redeemed',
    body: `${record.code} added $${record.amount.toFixed(2)} to your store credit.`,
    href: '/dashboard/store-credit',
  })

  return getStoreCreditSummary(userId)
}

export async function issueAdminStoreCredit(userId: string, amount: number, note?: string, expiresAt?: string | null) {
  const config = await getStoreCreditProgramConfig()
  const ledger = await normalizeStoreCreditLedger(userId, await getStoreCreditLedger(userId))
  const rounded = roundMoney(amount)
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error('Credit amount must be greater than zero')
  }
  ledger.balance = roundMoney(ledger.balance + rounded)
  ledger.entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'ADMIN_CREDIT',
    amount: rounded,
    note,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt ?? getExpiryDate(config.expiryDays),
    remainingAmount: rounded,
  })
  ledger.entries = ledger.entries.slice(0, 50)
  await saveStoreCreditLedger(userId, ledger)
  await pushRetentionNotification({
    userId,
    kind: 'STORE_CREDIT',
    title: 'Store credit added',
    body: `$${rounded.toFixed(2)} was added to your account balance.`,
    href: '/dashboard/store-credit',
  })
  return getStoreCreditSummary(userId)
}

export async function consumeStoreCredit(userId: string, amount: number, note?: string) {
  const ledger = await normalizeStoreCreditLedger(userId, await getStoreCreditLedger(userId))
  const rounded = roundMoney(amount)
  if (rounded <= 0) return ledger
  if (ledger.balance < rounded) {
    throw new Error('Insufficient store credit')
  }
  let remainingToConsume = rounded
  const creditLots = ledger.entries
    .filter((entry) => entry.type !== 'CHECKOUT_APPLIED' && entry.type !== 'EXPIRED' && (entry.remainingAmount ?? 0) > 0)
    .sort((left, right) => {
      const leftExpiry = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.MAX_SAFE_INTEGER
      const rightExpiry = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.MAX_SAFE_INTEGER
      return leftExpiry - rightExpiry
    })
  for (const lot of creditLots) {
    if (remainingToConsume <= 0) break
    const available = lot.remainingAmount ?? 0
    const consumed = Math.min(available, remainingToConsume)
    lot.remainingAmount = roundMoney(available - consumed)
    remainingToConsume = roundMoney(remainingToConsume - consumed)
  }
  ledger.balance = roundMoney(ledger.balance - rounded)
  ledger.entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'CHECKOUT_APPLIED',
    amount: -rounded,
    note,
    createdAt: new Date().toISOString(),
  })
  ledger.entries = ledger.entries.slice(0, 50)
  await saveStoreCreditLedger(userId, ledger)
  return ledger
}

export async function issueGiftCertificateFromBalance(input: {
  userId: string
  amount: number
  senderName: string
  recipientName: string
  recipientEmail: string
  personalMessage?: string
}) {
  const amount = roundMoney(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Gift certificate amount must be greater than zero')
  }

  const summary = await getStoreCreditSummary(input.userId)
  if (summary.balance < amount) {
    throw new Error('Insufficient store credit balance to fund this gift certificate')
  }

  const config = await getStoreCreditProgramConfig()
  const record = await issueGiftCard({
    amount,
    note: input.personalMessage,
    expiresAt: getExpiryDate(config.expiryDays),
    purchaserUserId: input.userId,
    senderName: input.senderName,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    personalMessage: input.personalMessage,
    source: 'BUYER_BALANCE',
    deliverNow: true,
  })

  await consumeStoreCredit(input.userId, amount, `Converted to gift certificate ${record.code}`)

  await pushRetentionNotification({
    userId: input.userId,
    kind: 'STORE_CREDIT',
    title: 'Gift certificate sent',
    body: `${record.code} for $${amount.toFixed(2)} was created for ${input.recipientName}.`,
    href: '/dashboard/store-credit',
  })

  return record
}

export async function getGiftCardAdminData() {
  const config = await getStoreCreditProgramConfig()
  const [giftCardRows, creditRows] = await Promise.all([
    prisma.siteSettings.findMany({
      where: { key: { startsWith: 'giftCard:' } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.siteSettings.findMany({
      where: { key: { startsWith: 'storeCredit:' } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ])

  const giftCards = giftCardRows.flatMap((row) => {
    try {
      return [JSON.parse(row.value) as GiftCardRecord]
    } catch {
      return []
    }
  })

  const balances = creditRows.flatMap((row) => {
    try {
      const parsed = JSON.parse(row.value) as StoreCreditLedger
      const cutoff = new Date(Date.now() + config.expiringSoonDays * 24 * 60 * 60 * 1000)
      const expiringSoon = Array.isArray(parsed.entries)
        ? parsed.entries.reduce((sum, entry) => {
            if (!entry.expiresAt || !entry.remainingAmount || entry.remainingAmount <= 0) {
              return sum
            }
            const expiresAt = new Date(entry.expiresAt)
            if (expiresAt < new Date() || expiresAt > cutoff) {
              return sum
            }
            return sum + entry.remainingAmount
          }, 0)
        : 0
      return [
        {
          userId: row.key.replace('storeCredit:', ''),
          balance: parsed.balance ?? 0,
          entries: Array.isArray(parsed.entries) ? parsed.entries.length : 0,
          expiringSoon: roundMoney(expiringSoon),
        },
      ]
    } catch {
      return []
    }
  })

  return {
    config,
    giftCards,
    balances,
  }
}
