import { prisma } from '@/lib/prisma'

export type StoreLocatorMeta = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  latitude?: string
  longitude?: string
  hours?: string
}

function getStoreLocatorKey(storeId: string) {
  return `storeLocator:${storeId}`
}

export function parseStoreLocatorMeta(raw: string | null | undefined): StoreLocatorMeta {
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as StoreLocatorMeta
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function getStoreLocatorMeta(storeId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getStoreLocatorKey(storeId) },
  })

  return parseStoreLocatorMeta(row?.value)
}

export async function setStoreLocatorMeta(storeId: string, input: StoreLocatorMeta) {
  const value = JSON.stringify({
    addressLine1: input.addressLine1?.trim() || '',
    addressLine2: input.addressLine2?.trim() || '',
    city: input.city?.trim() || '',
    state: input.state?.trim() || '',
    postalCode: input.postalCode?.trim() || '',
    country: input.country?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    latitude: input.latitude?.trim() || '',
    longitude: input.longitude?.trim() || '',
    hours: input.hours?.trim() || '',
  })

  await prisma.siteSettings.upsert({
    where: { key: getStoreLocatorKey(storeId) },
    update: { value },
    create: { key: getStoreLocatorKey(storeId), value },
  })
}

export async function getStoreLocatorMetaMap(storeIds: string[]) {
  const uniqueStoreIds = Array.from(new Set(storeIds.filter(Boolean)))
  if (uniqueStoreIds.length === 0) {
    return new Map<string, StoreLocatorMeta>()
  }

  const rows = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: uniqueStoreIds.map((storeId) => getStoreLocatorKey(storeId)),
      },
    },
  })

  return new Map(
    uniqueStoreIds.map((storeId) => {
      const row = rows.find((entry) => entry.key === getStoreLocatorKey(storeId))
      return [storeId, parseStoreLocatorMeta(row?.value)]
    })
  )
}

export function formatStoreLocatorLine(meta: StoreLocatorMeta) {
  return [
    meta.addressLine1,
    meta.addressLine2,
    [meta.city, meta.state].filter(Boolean).join(', '),
    meta.postalCode,
    meta.country,
  ]
    .filter(Boolean)
    .join(' | ')
}
