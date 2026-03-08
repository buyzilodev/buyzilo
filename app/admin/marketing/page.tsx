import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { StatCard } from '@/components/admin/StatCard'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminMarketingPage() {
  const [coupons, featuredSetting, campaignSetting] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.siteSettings.findUnique({ where: { key: 'featuredProductSlugs' } }),
    prisma.siteSettings.findUnique({ where: { key: 'homepageCampaignConfig' } }),
  ])

  return (
    <AdminLayout title="Marketing" subtitle="Campaign and promotion foundations">
      <SubsectionNav items={adminMarketingSubsections} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Coupons" value={String(coupons.length)} hint="Configured promotion codes" />
        <StatCard label="Active Coupons" value={String(coupons.filter((coupon) => coupon.isActive).length)} hint="Currently usable" />
        <StatCard label="Coupon Uses" value={String(coupons.reduce((sum, coupon) => sum + coupon.usedCount, 0))} hint="Total redemptions" />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Coupon Management</h3>
          <Link href="/admin/coupons" className="text-xs font-semibold text-blue-600 hover:underline">
            Open Coupons
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-2">Code</th>
                <th className="pb-2">Discount</th>
                <th className="pb-2">Usage</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.slice(0, 8).map((coupon) => (
                <tr key={coupon.id} className="border-t border-slate-100">
                  <td className="py-2 font-mono text-xs text-slate-700">{coupon.code}</td>
                  <td className="py-2 text-slate-700">{coupon.isPercent ? `${coupon.discount}%` : `$${coupon.discount}`}</td>
                  <td className="py-2 text-slate-600">{coupon.usedCount}/{coupon.maxUses ?? 'unlimited'}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${coupon.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {coupon.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SettingKeyEditor
          settingKey="featuredProductSlugs"
          label="Featured Product Slugs"
          description="Comma-separated product slugs for homepage featured blocks."
          initialValue={featuredSetting?.value ?? ''}
          placeholder="wireless-headphones,smart-watch-pro-x"
        />
        <SettingKeyEditor
          settingKey="homepageCampaignConfig"
          label="Homepage Campaign Config"
          description="JSON block for campaign banners and promotion labels."
          multiline
          initialValue={
            campaignSetting?.value ??
            JSON.stringify({ title: 'Mega Sale', subtitle: 'Up to 50% Off', cta: 'Shop now' }, null, 2)
          }
        />
      </div>
    </AdminLayout>
  )
}
