import { prisma } from '@/lib/prisma'

export type SupportRequestMeta = {
  type?: 'TICKET' | 'CALL_REQUEST'
  callbackPhone?: string | null
  callbackWindow?: string | null
}

const SUPPORT_META_PREFIX = 'supportMeta:'

function parseMeta(value?: string | null): SupportRequestMeta {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as SupportRequestMeta
    return {
      type: parsed.type === 'CALL_REQUEST' ? 'CALL_REQUEST' : 'TICKET',
      callbackPhone: parsed.callbackPhone?.trim() || null,
      callbackWindow: parsed.callbackWindow?.trim() || null,
    }
  } catch {
    return {}
  }
}

export async function getSupportMeta(requestId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: `${SUPPORT_META_PREFIX}${requestId}` },
    select: { value: true },
  })

  return parseMeta(row?.value)
}

export async function getSupportMetaMap(requestIds: string[]) {
  if (requestIds.length === 0) {
    return {} as Record<string, SupportRequestMeta>
  }

  const rows = await prisma.siteSettings.findMany({
    where: {
      key: { in: requestIds.map((requestId) => `${SUPPORT_META_PREFIX}${requestId}`) },
    },
    select: { key: true, value: true },
  })

  return Object.fromEntries(
    rows.map((row) => [row.key.replace(SUPPORT_META_PREFIX, ''), parseMeta(row.value)]),
  ) as Record<string, SupportRequestMeta>
}

export async function setSupportMeta(requestId: string, meta: SupportRequestMeta) {
  const payload: SupportRequestMeta = {
    type: meta.type === 'CALL_REQUEST' ? 'CALL_REQUEST' : 'TICKET',
    callbackPhone: meta.callbackPhone?.trim() || null,
    callbackWindow: meta.callbackWindow?.trim() || null,
  }

  await prisma.siteSettings.upsert({
    where: { key: `${SUPPORT_META_PREFIX}${requestId}` },
    update: { value: JSON.stringify(payload) },
    create: {
      key: `${SUPPORT_META_PREFIX}${requestId}`,
      value: JSON.stringify(payload),
    },
  })
}
