'use client'

import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/admin/StatusBadge'

type RecentOrder = {
  id: string
  createdAt: string
  customer: string
  total: number
  status: string
}

type RecentOrdersCardProps = {
  orders: RecentOrder[]
}

const tabs = ['ALL', 'COMPLETE', 'OPEN'] as const

export function RecentOrdersCard({ orders }: RecentOrdersCardProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('ALL')

  const filtered = useMemo(() => {
    if (tab === 'ALL') return orders
    if (tab === 'COMPLETE') return orders.filter((o) => ['DELIVERED', 'SHIPPED'].includes(o.status))
    return orders.filter((o) => ['PENDING', 'PROCESSING'].includes(o.status))
  }, [orders, tab])

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <header className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Recent Orders</h3>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${tab === item ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
              <th className="pb-2 font-semibold">Order</th>
              <th className="pb-2 font-semibold">Customer</th>
              <th className="pb-2 font-semibold">Date</th>
              <th className="pb-2 font-semibold">Total</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                <td className="py-3 font-mono text-xs text-blue-700">{order.id.slice(0, 8)}...</td>
                <td className="py-3 text-slate-700">{order.customer}</td>
                <td className="py-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="py-3 font-semibold text-slate-900">${order.total.toFixed(2)}</td>
                <td className="py-3"><StatusBadge status={order.status} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">No orders found for this tab.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  )
}
