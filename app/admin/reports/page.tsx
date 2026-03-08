import { AdminLayout } from '@/components/AdminLayout'
import { ProcurementReportsPanel } from '@/components/admin/ProcurementReportsPanel'
import { Section } from '@/components/admin/Section'
import { ReportsPanel } from '@/components/admin/ReportsPanel'
import { StatCard } from '@/components/admin/StatCard'
import { getAdminInventoryReportData } from '@/lib/queries/admin/inventory'
import { getAdminProcurementReportData } from '@/lib/queries/admin/procurementReport'
import { getAdminReportsData } from '@/lib/queries/admin/reports'

export default async function ReportsPage() {
  const [data, inventory, procurement] = await Promise.all([
    getAdminReportsData(),
    getAdminInventoryReportData(),
    getAdminProcurementReportData(),
  ])

  const stats = [
    { label: 'Total Revenue', value: `$${data.stats.totalRevenue.toFixed(2)}`, hint: 'Gross order revenue' },
    { label: 'Total Orders', value: String(data.stats.totalOrders), hint: 'All-time order count' },
    { label: 'Total Users', value: String(data.stats.totalUsers), hint: 'All platform accounts' },
    { label: 'Active Vendors', value: String(data.stats.activeVendors), hint: 'Approved stores' },
    { label: 'Avg Order Value', value: `$${data.stats.avgOrderValue.toFixed(2)}`, hint: 'Revenue per order' },
    { label: 'Platform Commission', value: `$${data.stats.platformCommission.toFixed(2)}`, hint: 'Estimated fee earnings' },
  ]

  return (
    <AdminLayout title="Statistics & Reports" subtitle="Marketplace analytics powered by real data">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Loyalty Coupons" value={String(data.stats.loyaltyCoupons)} hint="Reward coupons generated" />
        <StatCard label="Referred Signups" value={String(data.stats.referredSignups)} hint="Attributed buyer registrations" />
        <StatCard label="Gift Cards Issued" value={String(data.stats.issuedGiftCards)} hint="Stored-value codes created" />
        <StatCard label="Active Store Credit" value={String(data.stats.activeStoreCreditBalances)} hint="Buyer balances above zero" />
      </div>

      <div className="mt-4">
        <ReportsPanel data={data} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,1fr]">
        <Section title="Retention Trend" subtitle="Loyalty coupon activity and referral-driven acquisition over the last 7 months">
          <div className="space-y-2">
            {data.retention.loyaltyCouponUsage.map((item) => (
              <div key={item.month} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{item.month}</span>
                  <span className="text-slate-600">Created {item.created} | Used {item.used}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Referral signups: {data.retention.referralSignups.find((entry) => entry.month === item.month)?.signups ?? 0}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Store Credit Exposure" subtitle="Outstanding balances and recent buyer wallet movement">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Outstanding balance</p>
            <p className="mt-1 text-lg font-bold text-slate-900">${data.retention.storeCreditLedger.totalOutstandingBalance.toFixed(2)}</p>
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.08em] text-amber-700">Expiring soon</p>
            <p className="mt-1 text-lg font-bold text-amber-800">${data.retention.storeCreditLedger.expiringSoonBalance.toFixed(2)}</p>
          </div>
          <div className="mt-3 space-y-2">
            {data.retention.storeCreditLedger.recentEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No recent store-credit activity.</p>
            ) : (
              data.retention.storeCreditLedger.recentEntries.map((entry) => (
                <div key={`${entry.userId}-${entry.createdAt}-${entry.type}`} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.type.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-slate-500">{entry.userId}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${entry.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {entry.amount >= 0 ? '+' : ''}${Math.abs(entry.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Procurement Suppliers" value={String(procurement.stats.suppliers)} hint="Suppliers active in the last 7 months" />
        <StatCard label="Procurement POs" value={String(procurement.stats.purchaseOrders)} hint="Purchase orders created in the last 7 months" />
        <StatCard label="Overdue Procurement" value={String(procurement.stats.overduePurchaseOrders)} hint="Open POs past expected date" />
        <StatCard label="Committed Procurement" value={`$${procurement.stats.committedSpend.toFixed(2)}`} hint="Open replenishment cost" />
        <StatCard label="Avg Procurement Fill" value={`${procurement.stats.avgFillRate.toFixed(1)}%`} hint="Average PO fill rate" />
      </div>

      <div className="mt-4">
        <ProcurementReportsPanel data={procurement} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Warehouses" value={String(inventory.stats.totalWarehouses)} hint="Active warehouse records" />
        <StatCard label="Warehouse Units" value={String(inventory.stats.totalWarehouseUnits)} hint="Tracked units across locations" />
        <StatCard label="Low Stock" value={String(inventory.stats.lowStockProducts)} hint="Products at 1-5 units" />
        <StatCard label="Out Of Stock" value={String(inventory.stats.outOfStockProducts)} hint="Products needing replenishment" />
        <StatCard label="7-Day Adjustments" value={String(inventory.stats.recentAdjustments)} hint="Recent inventory changes" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <Section title="Low Stock Watchlist" subtitle="Products approaching stock depletion across the marketplace">
          {inventory.lowStockProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No low-stock products right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Vendor</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.lowStockProducts.map((product) => (
                    <tr key={product.id} className="border-t border-slate-100">
                      <td className="py-3 font-semibold text-slate-900">{product.name}</td>
                      <td className="py-3 text-slate-600">{product.storeName}</td>
                      <td className="py-3 text-slate-600">{product.categoryName}</td>
                      <td className="py-3 font-semibold text-amber-700">{product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Warehouse Balances" subtitle="Warehouse footprint by vendor and total tracked units">
          {inventory.warehouseBalances.length === 0 ? (
            <p className="text-sm text-slate-500">No warehouse data yet.</p>
          ) : (
            <div className="space-y-2">
              {inventory.warehouseBalances.map((warehouse) => (
                <div key={warehouse.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {warehouse.name}{warehouse.code ? ` (${warehouse.code})` : ''}
                      </p>
                      <p className="text-xs text-slate-500">{warehouse.storeName}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900">{warehouse.totalUnits} units</p>
                      <p className="text-xs text-slate-500">{warehouse.skuCount} stock rows</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="Recent Inventory Adjustments" subtitle="Recent set, adjustment, restock, transfer, and removal activity">
          {inventory.recentAdjustments.length === 0 ? (
            <p className="text-sm text-slate-500">No adjustment activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Warehouse</th>
                    <th className="pb-3">Actor</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.recentAdjustments.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="py-3 text-slate-600">{entry.createdAt.toLocaleString()}</td>
                      <td className="py-3 font-semibold text-slate-900">{entry.type}</td>
                      <td className="py-3 text-slate-700">
                        {entry.productName}{entry.variantTitle ? ` (${entry.variantTitle})` : ''}
                      </td>
                      <td className="py-3 text-slate-600">{entry.warehouseName}</td>
                      <td className="py-3 text-slate-600">{entry.actorName || entry.actorEmail || 'System'}</td>
                      <td className={`py-3 font-semibold ${entry.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {entry.quantity >= 0 ? `+${entry.quantity}` : entry.quantity}
                      </td>
                      <td className="py-3 text-slate-600">{entry.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </AdminLayout>
  )
}
