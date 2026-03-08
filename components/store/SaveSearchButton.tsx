'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

type SaveSearchButtonProps = {
  label: string
  search?: string
  category?: string
  tag?: string
  sort?: 'default' | 'price-low' | 'price-high' | 'newest'
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
}

export default function SaveSearchButton({
  label,
  search,
  category,
  tag,
  sort,
  minPrice,
  maxPrice,
  inStock,
  minRating,
}: SaveSearchButtonProps) {
  const { status } = useSession()
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (status !== 'authenticated') {
      alert('Please sign in to save searches.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, search, category, tag, sort, minPrice, maxPrice, inStock, minRating }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        alert(data.error ?? 'Failed to save search')
        return
      }
      alert('Search saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={saving}
      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      {saving ? 'Saving...' : 'Save Search'}
    </button>
  )
}
