'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartMount } from '@/components/admin/ChartMount'
import type { AdminProcurementReportData } from '@/lib/queries/admin/procurementReport'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProcurementReportsPanel({ data }: { data: AdminProcurementReportData }) {
  const mounted = useChartMount()
  const topSuppliers = data.supplierScorecards.slice(0, 6)
  const riskSuppliers = [...data.supplierScorecards]
    .sort((left, right) => {
      if (right.overduePurchaseOrders !== left.overduePurchaseOrders) {
        return right.overduePurchaseOrders - left.overduePurchaseOrders
      }
      return right.committedSpend - left.committedSpend
    })
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Procurement Spend Trend</h3>
          <div className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlySpend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number | string | undefined) => formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))} />
                  <Legend />
                  <Line type="monotone" dataKey="committed" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="received" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-50" />
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Procurement Volume & Delay</h3>
          <div className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyOperations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ordered" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-50" />
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Top Supplier Scorecards</h3>
          <div className="space-y-2">
            {topSuppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-lg border border-slate-200 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                    <p className="text-xs text-slate-500">{supplier.storeName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{supplier.avgFillRate.toFixed(1)}%</p>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Fill rate</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {supplier.purchaseOrders} POs
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                    {formatCurrency(supplier.committedSpend)}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${supplier.overduePurchaseOrders > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {supplier.overduePurchaseOrders} overdue
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Late Supplier Exposure</h3>
          <div className="space-y-2">
            {riskSuppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-lg border border-slate-200 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
                    <p className="text-xs text-slate-500">
                      {supplier.unitsReceived} / {supplier.unitsOrdered} units received
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${supplier.overduePurchaseOrders > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {supplier.overduePurchaseOrders} overdue
                    </p>
                    <p className="text-xs text-slate-500">{formatCurrency(supplier.committedSpend)} open</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
