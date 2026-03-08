import { prisma } from '@/lib/prisma'

export type VendorCategoryFeeConfig = {
  categoryId: string
  feePercent: number
}

function clampFeePercent(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Number(value.toFixed(2))))
}

export function parseVendorCategoryFeeConfig(raw: string | null | undefined) {
  if (!raw) {
    return [] as VendorCategoryFeeConfig[]
  }

  try {
    const parsed = JSON.parse(raw) as Array<Partial<VendorCategoryFeeConfig>>
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((entry) => ({
        categoryId: entry.categoryId?.trim() ?? '',
        feePercent: clampFeePercent(entry.feePercent),
      }))
      .filter((entry) => entry.categoryId.length > 0)
  } catch {
    return []
  }
}

export async function getVendorCategoryFeeConfig() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'vendorCategoryFeeConfig' },
  })

  return parseVendorCategoryFeeConfig(row?.value)
}

export async function getVendorCategoryFeeMap() {
  const rows = await getVendorCategoryFeeConfig()
  return new Map(rows.map((row) => [row.categoryId, row.feePercent]))
}
