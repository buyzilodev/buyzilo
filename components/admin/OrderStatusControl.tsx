'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ORDER_STATUSES } from '@/lib/constants/statuses'

export function OrderStatusControl({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  async function onChange(nextStatus: string) {
    setStatus(nextStatus)
    setSaving(true)
    try {
      await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: nextStatus }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={status}
      onChange={(event) => onChange(event.target.value)}
      disabled={saving}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
    >
      {ORDER_STATUSES.map((item) => (
        <option key={item} value={item}>{item}</option>
      ))}
    </select>
  )
}
