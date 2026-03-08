'use client'

import { useState } from 'react'

type ProviderKey = 'google-merchant' | 'meta-catalog'

type LastRunState = {
  lastRunAt: string | null
  status: 'idle' | 'success' | 'error'
  provider: ProviderKey | null
  itemCount: number
  format: 'xml' | 'csv' | null
  url: string | null
  error: string | null
  history: Array<{
    ranAt: string
    status: 'success' | 'error'
    provider: ProviderKey
    itemCount: number
    format: 'xml' | 'csv'
    url: string
    error?: string | null
  }>
}

type DataFeedsManagerProps = {
  itemCount: number
  providers: Record<ProviderKey, { enabled: boolean; format: 'xml' | 'csv'; url: string }>
  initialLastRun: LastRunState
}

const providerLabels: Record<ProviderKey, string> = {
  'google-merchant': 'Google Merchant',
  'meta-catalog': 'Meta Catalog',
}

export function DataFeedsManager({ itemCount, providers, initialLastRun }: DataFeedsManagerProps) {
  const [lastRun, setLastRun] = useState(initialLastRun)
  const [running, setRunning] = useState<ProviderKey | null>(null)

  async function runFeed(provider: ProviderKey) {
    setRunning(provider)
    try {
      const response = await fetch('/api/admin/data-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string; lastRun?: LastRunState }
      if (!response.ok) {
        alert(data.error ?? 'Failed to run feed')
      }
      if (data.lastRun) {
        setLastRun(data.lastRun)
      }
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-4">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Feed Coverage</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Eligible Products</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{itemCount}</p>
          </div>
          {(['google-merchant', 'meta-catalog'] as ProviderKey[]).map((provider) => (
            <div key={provider} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{providerLabels[provider]}</p>
              <p className={`mt-2 text-sm font-semibold ${providers[provider].enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                {providers[provider].enabled ? 'Enabled' : 'Disabled'}
              </p>
              <a href={providers[provider].url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-blue-600 hover:underline">
                {providers[provider].url}
              </a>
              <button
                type="button"
                onClick={() => void runFeed(provider)}
                disabled={running !== null}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                {running === provider ? 'Running...' : 'Run export'}
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Recent Runs</h3>
        {lastRun.history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No feed runs recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Format</th>
                  <th className="px-3 py-2">Ran At</th>
                  <th className="px-3 py-2">Feed</th>
                </tr>
              </thead>
              <tbody>
                {lastRun.history.map((entry, index) => (
                  <tr key={`${entry.provider}-${entry.ranAt}-${index}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{providerLabels[entry.provider]}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{entry.itemCount}</td>
                    <td className="px-3 py-2 text-slate-700">{entry.format.toUpperCase()}</td>
                    <td className="px-3 py-2 text-slate-700">{new Date(entry.ranAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <a href={entry.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        Open feed
                      </a>
                      {entry.error ? <p className="mt-1 text-xs text-rose-600">{entry.error}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  )
}
