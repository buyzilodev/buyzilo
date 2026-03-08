import { prisma } from '@/lib/prisma'

export type VendorTermsConfig = {
  enabled: boolean
  version: string
  title: string
  summary: string
  content: string
}

export type VendorTermsAcceptance = {
  version: string
  acceptedAt: string
}

const defaultConfig: VendorTermsConfig = {
  enabled: false,
  version: '2026-03',
  title: 'Vendor Terms',
  summary: 'Marketplace rules for sellers operating on Buyzilo.',
  content: 'By creating a store, vendors agree to provide accurate listings, fulfill orders promptly, and follow marketplace policies.',
}

function getAcceptanceKey(userId: string) {
  return `vendorTermsAcceptance:${userId}`
}

export function parseVendorTermsConfig(raw: string | null | undefined): VendorTermsConfig {
  if (!raw) {
    return defaultConfig
  }

  try {
    const parsed = JSON.parse(raw) as Partial<VendorTermsConfig>
    return {
      enabled: parsed.enabled === true,
      version: parsed.version?.trim() || defaultConfig.version,
      title: parsed.title?.trim() || defaultConfig.title,
      summary: parsed.summary?.trim() || defaultConfig.summary,
      content: parsed.content?.trim() || defaultConfig.content,
    }
  } catch {
    return defaultConfig
  }
}

export async function getVendorTermsConfig() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'vendorTermsConfig' },
  })

  return parseVendorTermsConfig(row?.value)
}

export async function getVendorTermsAcceptance(userId: string) {
  const row = await prisma.siteSettings.findUnique({
    where: { key: getAcceptanceKey(userId) },
  })

  if (!row?.value) {
    return null
  }

  try {
    const parsed = JSON.parse(row.value) as VendorTermsAcceptance
    if (!parsed.version || !parsed.acceptedAt) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function acceptVendorTerms(userId: string, version: string) {
  const acceptance: VendorTermsAcceptance = {
    version,
    acceptedAt: new Date().toISOString(),
  }

  await prisma.siteSettings.upsert({
    where: { key: getAcceptanceKey(userId) },
    update: { value: JSON.stringify(acceptance) },
    create: { key: getAcceptanceKey(userId), value: JSON.stringify(acceptance) },
  })

  return acceptance
}

export async function getVendorTermsStatus(userId: string) {
  const [config, acceptance] = await Promise.all([
    getVendorTermsConfig(),
    getVendorTermsAcceptance(userId),
  ])

  return {
    config,
    acceptance,
    isCurrentAccepted:
      !config.enabled || (acceptance?.version === config.version),
  }
}
