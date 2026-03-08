'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ProductApprovalControl({
  productId,
  currentStatus,
}: {
  productId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function updateStatus(status: 'APPROVED' | 'REJECTED') {
    const approvalNote = window.prompt('Optional moderation note', '') ?? ''
    setSaving(true)
    try {
      await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, approvalStatus: status, approvalNote }),
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
          onClick={() => updateStatus('APPROVED')}
          className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
        >
          Approve
        </button>
      )}
      {currentStatus !== 'REJECTED' && (
        <button
          type="button"
          disabled={saving}
          onClick={() => updateStatus('REJECTED')}
          className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
        >
          Reject
        </button>
      )}
    </div>
  )
}
