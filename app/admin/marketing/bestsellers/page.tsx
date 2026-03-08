import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { getBestsellerAdminData } from '@/lib/queries/bestsellers'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default async function AdminMarketingBestsellersPage() {
  const data = await getBestsellerAdminData()

  return (
    <AdminLayout title="Bestsellers" subtitle="Sales-driven bestseller merchandising and ranking window">
      <SubsectionNav items={adminMarketingSubsections} />

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <SettingKeyEditor
          settingKey="bestsellerConfig"
          label="Bestseller Config"
          description="JSON config for bestseller lookback window and storefront limit."
          multiline
          initialValue={data.config}
        />

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Current Bestsellers</h3>
              <p className="mt-1 text-xs text-slate-500">Ranked by units sold, then order count and revenue.</p>
            </div>
            <Link href="/products" className="text-xs font-semibold text-blue-600 hover:underline">
              Open storefront
            </Link>
          </div>
          {data.products.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No qualifying sold products yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Units</th>
                    <th className="pb-3">Orders</th>
                    <th className="pb-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-t border-slate-100">
                      <td className="py-3">
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.store.name} | {product.category.name}</p>
                      </td>
                      <td className="py-3 text-slate-700">{product.unitsSold}</td>
                      <td className="py-3 text-slate-700">{product.ordersCount}</td>
                      <td className="py-3 font-semibold text-slate-900">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </AdminLayout>
  )
}
