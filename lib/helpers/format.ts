export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

export function formatDate(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString()
}

export function formatDateTime(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString()
}

export function truncateId(value: string, length = 10) {
  if (!value) return ''
  return value.length <= length ? value : `${value.slice(0, length)}...`
}
