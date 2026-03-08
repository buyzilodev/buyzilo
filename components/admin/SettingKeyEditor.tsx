'use client'

import { useState } from 'react'

type SettingKeyEditorProps = {
  settingKey: string
  label: string
  description?: string
  initialValue?: string
  multiline?: boolean
  placeholder?: string
}

export function SettingKeyEditor({
  settingKey,
  label,
  description,
  initialValue = '',
  multiline = false,
  placeholder,
}: SettingKeyEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function onSave() {
    setSaving(true)
    setSaved(false)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: value }),
      })
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1600)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">{label}</h3>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      <div className="mt-3">
        {multiline ? (
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={8}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        ) : (
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
      </div>
    </article>
  )
}
