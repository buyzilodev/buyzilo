export type ShippingMethod = {
  code: string
  label: string
  price: number
  etaDays?: string
  freeOver?: number | null
  countries?: string[]
  isActive?: boolean
}

const defaultShippingMethods: ShippingMethod[] = [
  { code: 'STANDARD', label: 'Standard Shipping', price: 9.99, etaDays: '3-5 business days', freeOver: 100, isActive: true },
  { code: 'EXPRESS', label: 'Express Shipping', price: 19.99, etaDays: '1-2 business days', isActive: true },
]

export function parseShippingMethods(raw?: string | null) {
  if (!raw) return defaultShippingMethods
  try {
    const parsed = JSON.parse(raw) as ShippingMethod[]
    if (!Array.isArray(parsed)) return defaultShippingMethods
    const methods = parsed
      .map((method) => ({
        code: String(method.code ?? '').trim().toUpperCase(),
        label: String(method.label ?? method.code ?? '').trim(),
        price: Number(method.price ?? 0),
        etaDays: method.etaDays ? String(method.etaDays) : undefined,
        freeOver: method.freeOver != null ? Number(method.freeOver) : null,
        countries: Array.isArray(method.countries) ? method.countries.map((country) => String(country).trim().toUpperCase()) : undefined,
        isActive: method.isActive !== false,
      }))
      .filter((method) => method.code && method.label && Number.isFinite(method.price) && method.isActive)
    return methods.length > 0 ? methods : defaultShippingMethods
  } catch {
    return defaultShippingMethods
  }
}

export function resolveShippingMethod(
  methods: ShippingMethod[],
  code: string | undefined,
  subtotal: number,
  country?: string
) {
  const normalizedCountry = country?.trim().toUpperCase()
  const available = methods.filter((method) => {
    if (!normalizedCountry || !method.countries || method.countries.length === 0) return true
    return method.countries.includes(normalizedCountry)
  })
  const fallback = available[0] ?? methods[0]
  const selected = available.find((method) => method.code === code?.trim().toUpperCase()) ?? fallback
  const shippingAmount =
    selected.freeOver != null && subtotal >= selected.freeOver
      ? 0
      : selected.price

  return {
    method: selected,
    shippingAmount: Number(shippingAmount.toFixed(2)),
    availableMethods: available.length > 0 ? available : methods,
  }
}
