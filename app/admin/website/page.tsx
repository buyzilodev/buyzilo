import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { StatCard } from '@/components/admin/StatCard'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminWebsiteSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminWebsitePage() {
  const [pagesCount, activePagesCount, headerNavSetting, footerNavSetting, seoTitleSetting, seoDescriptionSetting, seoKeywordsSetting] = await Promise.all([
    prisma.customPage.count(),
    prisma.customPage.count({ where: { isActive: true } }),
    prisma.siteSettings.findUnique({ where: { key: 'headerNavigationConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'footerNavigationConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'seoDefaultTitle' } }),
    prisma.siteSettings.findUnique({ where: { key: 'seoDefaultDescription' } }),
    prisma.siteSettings.findUnique({ where: { key: 'seoDefaultKeywords' } }),
  ])

  return (
    <AdminLayout title="Website" subtitle="CMS and navigation management foundations">
      <SubsectionNav items={adminWebsiteSubsections} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Custom Pages" value={String(pagesCount)} hint="Total managed pages" />
        <StatCard label="Published Pages" value={String(activePagesCount)} hint="Visible on storefront" />
        <StatCard label="Navigation Config" value="2" hint="Header and footer blocks" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Content Modules</h3>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/admin/pages" className="block rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Custom Pages Manager
            </Link>
            <Link href="/admin/website/access-restrictions" className="block rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Access Restrictions
            </Link>
            <Link href="/admin/frontend" className="block rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Frontend Manager
            </Link>
            <Link href="/admin/settings" className="block rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Branding & Site Settings
            </Link>
          </div>
        </article>

        <SettingKeyEditor
          settingKey="headerNavigationConfig"
          label="Header Navigation Config"
          description="JSON array for top header links."
          multiline
          initialValue={headerNavSetting?.value ?? JSON.stringify([{ title: 'About', href: '/pages/about' }], null, 2)}
        />
      </div>

      <div className="mt-4">
        <SettingKeyEditor
          settingKey="footerNavigationConfig"
          label="Footer Navigation Config"
          description="JSON array for footer links and grouped menus."
          multiline
          initialValue={footerNavSetting?.value ?? JSON.stringify([{ title: 'Privacy Policy', href: '/pages/privacy-policy' }], null, 2)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SettingKeyEditor
          settingKey="seoDefaultTitle"
          label="Default SEO Title"
          description="Fallback site title used by root metadata."
          initialValue={seoTitleSetting?.value ?? 'Buyzilo - Shop Everything You Love'}
        />
        <SettingKeyEditor
          settingKey="seoDefaultDescription"
          label="Default SEO Description"
          description="Fallback site description for homepage and shared metadata."
          multiline
          initialValue={seoDescriptionSetting?.value ?? 'Multi-vendor marketplace for products, stores, and curated shopping.'}
        />
        <SettingKeyEditor
          settingKey="seoDefaultKeywords"
          label="Default SEO Keywords"
          description="Comma-separated fallback keywords."
          initialValue={seoKeywordsSetting?.value ?? 'marketplace, shopping, vendors, products'}
        />
      </div>
    </AdminLayout>
  )
}
