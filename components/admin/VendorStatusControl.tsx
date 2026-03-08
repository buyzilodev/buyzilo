'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function VendorStatusControl({ storeId, currentStatus }: { storeId: string; currentStatus: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function setStatus(status: 'APPROVED' | 'BANNED') {
    const moderationNote = window.prompt('Optional moderation note', '') ?? ''
    setSaving(true)
    try {
      await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storeId, status, moderationNote }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== 'APPROVED' && (
        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('APPROVED')}
          className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
        >
          Approve
        </button>
      )}
      {currentStatus !== 'BANNED' && (
        <button
          type="button"
          disabled={saving}
          onClick={() => setStatus('BANNED')}
          className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
        >
          Ban
        </button>
      )}
    </div>
  )
}
