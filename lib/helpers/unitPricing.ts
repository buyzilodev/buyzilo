export type UnitPricing = {
  quantity: number
  unit: string
}

export function normalizeUnitPricing(input?: {
  quantity?: number | null
  unit?: string | null
} | null): UnitPricing | null {
  const quantity = Number(input?.quantity ?? 0)
  const unit = input?.unit?.trim() ?? ''

  if (!Number.isFinite(quantity) || quantity <= 0 || !unit) {
    return null
  }

  return {
    quantity,
    unit,
  }
}

export function formatUnitPricing(price: number, unitPricing?: UnitPricing | null) {
  if (!unitPricing || unitPricing.quantity <= 0) {
    return null
  }

  return {
    unitPrice: price / unitPricing.quantity,
    label: `${trimUnitNumber(unitPricing.quantity)} ${unitPricing.unit}`,
  }
}

function trimUnitNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
