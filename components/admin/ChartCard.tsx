'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useChartMount } from '@/components/admin/ChartMount'

type ChartPoint = {
  day: string
  sales: number
}

type ChartCardProps = {
  title: string
  amount: string
  data: ChartPoint[]
}

export function ChartCard({ title, amount, data }: ChartCardProps) {
  const mounted = useChartMount()

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-end justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{amount}</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Trend</span>
      </div>
      <div className="h-44">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip formatter={(value: number | string | undefined) => {
                const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
                return `$${numericValue.toFixed(0)}`
              }} />
              <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2.5, fill: '#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-xl bg-slate-50" />
        )}
      </div>
    </article>
  )
}
