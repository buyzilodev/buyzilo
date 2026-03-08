import { prisma } from '@/lib/prisma'

type SmsConfig = {
  enabled: boolean
  accountSid?: string
  authToken?: string
  fromNumber?: string
  orderCreated?: boolean
  orderShipped?: boolean
  orderDelivered?: boolean
}

type OrderCreatedSmsInput = {
  phone: string
  name?: string | null
  orderId: string
  total: number
}

type ShipmentStatusSmsInput = {
  phone: string
  name?: string | null
  orderId: string
  status: 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED'
  trackingNumber?: string | null
}

function parseSmsConfig(raw?: string | null): SmsConfig {
  if (!raw) {
    return { enabled: false }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SmsConfig>
    return {
      enabled: Boolean(parsed.enabled),
      accountSid: typeof parsed.accountSid === 'string' ? parsed.accountSid.trim() : undefined,
      authToken: typeof parsed.authToken === 'string' ? parsed.authToken.trim() : undefined,
      fromNumber: typeof parsed.fromNumber === 'string' ? parsed.fromNumber.trim() : undefined,
      orderCreated: parsed.orderCreated !== false,
      orderShipped: parsed.orderShipped !== false,
      orderDelivered: parsed.orderDelivered !== false,
    }
  } catch {
    return { enabled: false }
  }
}

async function getSmsConfig() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'smsConfig' },
    select: { value: true },
  })

  return parseSmsConfig(row?.value)
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.startsWith('+') ? trimmed : trimmed.replace(/[^\d+]/g, '')
}

function readAddressValue(address: unknown, keys: string[]) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) return null
  const record = address as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

export function getOrderPhone(address: unknown) {
  return normalizePhone(readAddressValue(address, ['phone', 'phoneNumber', 'mobile', 'telephone']))
}

export function getOrderContactName(address: unknown, fallback?: string | null) {
  const fullName = readAddressValue(address, ['name', 'fullName'])
  if (fullName) return fullName

  const firstName = readAddressValue(address, ['firstName', 'firstname'])
  const lastName = readAddressValue(address, ['lastName', 'lastname'])
  const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
  return combined || fallback || 'Customer'
}

async function sendSmsMessage(to: string, body: string) {
  const config = await getSmsConfig()
  if (!config.enabled || !config.accountSid || !config.authToken || !config.fromNumber) {
    return { sent: false, skipped: 'SMS not configured' as const }
  }

  const payload = new URLSearchParams({
    To: to,
    From: config.fromNumber,
    Body: body,
  })

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SMS delivery failed: ${response.status} ${errorText}`)
  }

  return { sent: true as const }
}

export async function sendOrderCreatedSms(input: OrderCreatedSmsInput) {
  const config = await getSmsConfig()
  if (!config.enabled || config.orderCreated === false) {
    return { sent: false, skipped: 'Order-created SMS disabled' as const }
  }

  return sendSmsMessage(
    input.phone,
    `Hi ${input.name || 'Customer'}, your Buyzilo order ${input.orderId} was received. Total: $${input.total.toFixed(2)}.`
  )
}

export async function sendShipmentStatusSms(input: ShipmentStatusSmsInput) {
  const config = await getSmsConfig()
  if (
    !config.enabled ||
    (input.status === 'SHIPPED' && config.orderShipped === false) ||
    (input.status === 'IN_TRANSIT' && config.orderShipped === false) ||
    (input.status === 'DELIVERED' && config.orderDelivered === false)
  ) {
    return { sent: false, skipped: 'Shipment SMS disabled' as const }
  }

  const tracking = input.trackingNumber ? ` Tracking: ${input.trackingNumber}.` : ''
  const statusLabel =
    input.status === 'IN_TRANSIT' ? 'is in transit' : input.status === 'DELIVERED' ? 'was delivered' : 'has shipped'

  return sendSmsMessage(
    input.phone,
    `Hi ${input.name || 'Customer'}, your Buyzilo order ${input.orderId} ${statusLabel}.${tracking}`
  )
}
