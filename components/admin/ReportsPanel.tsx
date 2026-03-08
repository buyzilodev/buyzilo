'use client'

import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartMount } from '@/components/admin/ChartMount'
import type { AdminReportsData } from '@/lib/queries/admin/reports'

const pieColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ReportsPanel({ data }: { data: AdminReportsData }) {
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily')
  const mounted = useChartMount()

  const salesData = period === 'daily' ? data.dailySales : data.monthlySales
  const xKey = period === 'daily' ? 'day' : 'month'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(['daily', 'monthly'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPeriod(item)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              period === item ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {item === 'daily' ? 'Last 7 days' : 'Last 7 months'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Revenue Trend</h3>
          <div className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey={xKey} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-50" />
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Revenue by Category</h3>
          <div className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {data.categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | string | undefined) => formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-50" />
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Top Vendors</h3>
          <div className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topVendors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip formatter={(value: number | string | undefined) => formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))} />
                  <Bar dataKey="sales" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-50" />
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">User Growth</h3>
          <div className="h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="buyers" stroke="#0ea5e9" />
                  <Line type="monotone" dataKey="vendors" stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-slate-50" />
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Top Vendors Table</h3>
          <div className="space-y-2">
            {data.topVendors.map((vendor) => (
              <div key={vendor.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">{vendor.name}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(vendor.sales)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Top Products Table</h3>
          <div className="space-y-2">
            {data.topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-700">{product.name}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(product.revenue)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
