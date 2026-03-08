export type ProductOptionInput = {
  name: string
  values: string[]
}

export type ProductVariantInput = {
  key: string
  title: string
  sku?: string | null
  price?: number | null
  comparePrice?: number | null
  stock?: number
  image?: string | null
  isDefault?: boolean
  isActive?: boolean
  selections: Record<string, string>
}

export function normalizeProductOptions(input: ProductOptionInput[] | undefined | null) {
  return (input ?? [])
    .map((option) => ({
      name: option.name.trim(),
      values: Array.from(
        new Set(
          (option.values ?? [])
            .map((value) => value.trim())
            .filter(Boolean)
        )
      ),
    }))
    .filter((option) => option.name && option.values.length > 0)
    .map((option, index) => ({
      ...option,
      position: index,
    }))
}

export function buildSelectionKey(selections: Record<string, string>) {
  return Object.entries(selections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}:${value}`)
    .join('|')
}

export function generateVariantCombinations(options: ProductOptionInput[] | undefined | null) {
  const normalized = normalizeProductOptions(options)
  if (normalized.length === 0) return []

  const variants = normalized.reduce<Array<Record<string, string>>>(
    (acc, option) =>
      acc.flatMap((row) =>
        option.values.map((value) => ({
          ...row,
          [option.name]: value,
        }))
      ),
    [{}]
  )

  return variants.map((selections, index) => {
    const title = Object.entries(selections)
      .map(([name, value]) => `${name}: ${value}`)
      .join(' / ')

    return {
      key: buildSelectionKey(selections),
      title,
      sku: '',
      price: null,
      comparePrice: null,
      stock: 0,
      image: '',
      isDefault: index === 0,
      isActive: true,
      selections,
    }
  })
}

export function mergeGeneratedVariants(
  options: ProductOptionInput[] | undefined | null,
  existing: ProductVariantInput[] | undefined | null,
  defaults?: { stock?: number }
) {
  const generated = generateVariantCombinations(options)
  const existingMap = new Map((existing ?? []).map((variant) => [variant.key, variant]))

  return generated.map((variant, index) => {
    const previous = existingMap.get(variant.key)
    return {
      ...variant,
      sku: previous?.sku ?? '',
      price: previous?.price ?? null,
      comparePrice: previous?.comparePrice ?? null,
      stock: previous?.stock ?? defaults?.stock ?? 0,
      image: previous?.image ?? '',
      isDefault: previous?.isDefault ?? index === 0,
      isActive: previous?.isActive ?? true,
    }
  })
}

export function hasUsableVariants(variants: Array<{ isActive?: boolean }> | undefined | null) {
  return Array.isArray(variants) && variants.some((variant) => variant.isActive !== false)
}

export function getVariantSignature(variantId?: string | null) {
  return variantId && variantId.trim() ? variantId : 'default'
}
