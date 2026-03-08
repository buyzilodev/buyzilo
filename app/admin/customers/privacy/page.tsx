'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminCustomerSubsections } from '@/components/admin/subsections'

type RequestRow = {
  userId: string
  email: string
  status: string
  reason?: string
  requestedAt: string
  processedAt?: string | null
  resolutionNote?: string | null
}

export default function AdminCustomerPrivacyPage() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/admin/gdpr')
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setRequests(data.requests ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function process(userId: string, action: 'APPROVE' | 'REJECT') {
    const resolutionNote = window.prompt(action === 'APPROVE' ? 'Resolution note for anonymization' : 'Reason for rejection') ?? ''
    const response = await fetch('/api/admin/gdpr', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, resolutionNote }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error ?? 'Failed to process request')
      return
    }
    setMessage(action === 'APPROVE' ? 'Deletion request completed.' : 'Deletion request rejected.')
    const refresh = await fetch('/api/admin/gdpr')
    const refreshData = await refresh.json()
    setRequests(refreshData.requests ?? [])
  }

  return (
    <AdminLayout title="Privacy Requests" subtitle="Review GDPR deletion requests and process anonymization">
      <SubsectionNav items={adminCustomerSubsections} />
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading privacy requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No GDPR deletion requests recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Requested</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.userId} className="border-t border-slate-100 align-top">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{request.email}</p>
                      <p className="text-xs text-slate-500">{request.userId}</p>
                    </td>
                    <td className="py-3 text-slate-600">{new Date(request.requestedAt).toLocaleString()}</td>
                    <td className="py-3 text-slate-700">{request.status}</td>
                    <td className="py-3 text-slate-600">
                      {request.reason ?? 'No reason provided'}
                      {request.resolutionNote && <p className="mt-1 text-xs text-slate-400">Resolution: {request.resolutionNote}</p>}
                    </td>
                    <td className="py-3">
                      {request.status === 'REQUESTED' ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void process(request.userId, 'APPROVE')} className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                            Approve
                          </button>
                          <button type="button" onClick={() => void process(request.userId, 'REJECT')} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      </article>
    </AdminLayout>
  )
}
