import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export type ZapierEventName =
  | 'order.created'
  | 'quote.requested'
  | 'quote.updated'
  | 'support.created'
  | 'return.requested'
  | 'shipment.updated'
  | 'payout.requested'

export type ZapierConfig = {
  enabled: boolean
  webhookUrl: string
  secret: string
  subscribedEvents: ZapierEventName[]
}

type ZapierLogEntry = {
  id: string
  event: ZapierEventName
  deliveredAt: string
  success: boolean
  statusCode?: number | null
  message: string
}

const defaultConfig: ZapierConfig = {
  enabled: false,
  webhookUrl: '',
  secret: '',
  subscribedEvents: ['order.created', 'quote.requested', 'quote.updated', 'support.created', 'return.requested', 'shipment.updated', 'payout.requested'],
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function getZapierConfig(): Promise<ZapierConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'zapierConfig' },
  })
  const parsed = parseJson<Partial<ZapierConfig>>(row?.value, {})
  return {
    enabled: parsed.enabled ?? defaultConfig.enabled,
    webhookUrl: parsed.webhookUrl ?? defaultConfig.webhookUrl,
    secret: parsed.secret ?? defaultConfig.secret,
    subscribedEvents: Array.isArray(parsed.subscribedEvents) ? parsed.subscribedEvents.filter(Boolean) as ZapierEventName[] : defaultConfig.subscribedEvents,
  }
}

async function appendZapierLog(entry: ZapierLogEntry) {
  const key = 'zapierLogs'
  const existing = await prisma.siteSettings.findUnique({ where: { key } })
  const current = parseJson<ZapierLogEntry[]>(existing?.value, [])
  const next = [entry, ...current].slice(0, 40)
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value: JSON.stringify(next) },
    create: { key, value: JSON.stringify(next) },
  })
}

export async function getZapierLogs() {
  const row = await prisma.siteSettings.findUnique({ where: { key: 'zapierLogs' } })
  return parseJson<ZapierLogEntry[]>(row?.value, [])
}

function signPayload(secret: string, body: string) {
  if (!secret.trim()) return ''
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function dispatchZapierEvent(event: ZapierEventName, payload: Record<string, unknown>) {
  const config = await getZapierConfig()
  if (!config.enabled || !config.webhookUrl.trim() || !config.subscribedEvents.includes(event)) {
    return { skipped: true }
  }

  const body = JSON.stringify({
    source: 'buyzilo',
    event,
    timestamp: new Date().toISOString(),
    payload,
  })

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Buyzilo-Event': event,
        'X-Buyzilo-Signature': signPayload(config.secret, body),
      },
      body,
    })

    await appendZapierLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event,
      deliveredAt: new Date().toISOString(),
      success: response.ok,
      statusCode: response.status,
      message: response.ok ? 'Delivered' : `HTTP ${response.status}`,
    })

    return { skipped: false, success: response.ok, status: response.status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await appendZapierLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event,
      deliveredAt: new Date().toISOString(),
      success: false,
      statusCode: null,
      message,
    })
    return { skipped: false, success: false, message }
  }
}
