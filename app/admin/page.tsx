import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { ChartCard } from '@/components/admin/ChartCard'
import { RecentOrdersCard } from '@/components/admin/RecentOrdersCard'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { canViewAdminWorkspace, getCurrentAdminWorkspaceIdentity, getDashboardData } from '@/lib/admin/dashboard'
import { getActiveAddonExtensions } from '@/lib/addons/manager'
import { hasPermission } from '@/lib/permissions'

type Shortcut = {
  href: string
  label: string
}

function toneClass(tone: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate') {
  const map = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return map[tone]
}

export default async function AdminDashboardPage() {
  const identity = await getCurrentAdminWorkspaceIdentity()
  const data = await getDashboardData(identity ?? undefined)
  const addonExtensions = await getActiveAddonExtensions({ identity: identity ?? undefined })

  const canManageOrders = identity ? hasPermission(identity.role, identity.permissions, 'manage_orders') : false
  const canManageProducts = identity ? hasPermission(identity.role, identity.permissions, 'manage_products') : false
  const canApproveProducts = identity ? hasPermission(identity.role, identity.permissions, 'approve_products') : false
  const canManageUsers = identity ? hasPermission(identity.role, identity.permissions, 'manage_users') : false
  const canManageVendors = identity ? hasPermission(identity.role, identity.permissions, 'manage_vendors') : false
  const canViewReports = identity ? hasPermission(identity.role, identity.permissions, 'view_reports') : false
  const canManageFinance = identity ? hasPermission(identity.role, identity.permissions, 'manage_finance') : false
  const canManageMarketing = identity ? hasPermission(identity.role, identity.permissions, 'manage_marketing') : false
  const canManageContent = identity ? hasPermission(identity.role, identity.permissions, 'manage_content') : false
  const canManageSettings = identity ? hasPermission(identity.role, identity.permissions, 'manage_settings') : false

  const topStats = [
    canViewReports || canManageFinance ? { label: 'Total Sales', value: `$${data.totalSales.toFixed(2)}`, hint: 'Gross marketplace revenue' } : null,
    canManageOrders ? { label: 'Total Orders', value: String(data.totalOrders), hint: 'All orders' } : null,
    canManageVendors ? { label: 'Vendors With Sales', value: String(data.totalVendors), hint: 'Approved vendors' } : null,
    canManageProducts || canApproveProducts ? { label: 'Active Products', value: String(data.activeProducts), hint: 'Live listings' } : null,
    canManageUsers ? { label: 'Registered Customers', value: String(data.registeredCustomers), hint: 'Buyer accounts' } : null,
    canManageOrders ? { label: 'Open Orders', value: String(data.openOrders), hint: 'Pending and processing' } : null,
    canManageMarketing ? { label: 'Loyalty Coupons', value: String(data.loyaltyCoupons), hint: 'Reward coupons generated' } : null,
    canManageFinance ? { label: 'Outstanding Store Credit', value: `$${data.outstandingStoreCredit.toFixed(2)}`, hint: 'Buyer wallet balance exposure' } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; hint: string }>

  const shortcuts: Shortcut[] = [
    canManageOrders ? { href: '/admin/orders', label: 'Order lifecycle and fulfillment' } : null,
    canManageOrders ? { href: '/admin/orders/call-requests', label: 'Support desk and callback queue' } : null,
    canManageProducts || canApproveProducts ? { href: '/admin/products/manage', label: 'Product moderation and catalog desk' } : null,
    canManageVendors ? { href: '/admin/vendors', label: 'Vendor approval and store controls' } : null,
    canManageFinance ? { href: '/admin/vendors/accounting', label: 'Payout and finance controls' } : null,
    canManageMarketing ? { href: '/admin/marketing', label: 'Marketing campaigns and offers' } : null,
    canManageContent ? { href: '/admin/website', label: 'Content, website, and CMS controls' } : null,
    canManageSettings ? { href: '/admin/settings', label: 'Marketplace settings and policies' } : null,
    canViewReports ? { href: '/admin/reports', label: 'Marketplace reports and rollups' } : null,
  ].filter(Boolean) as Shortcut[]

  const focusTitle = !identity || !canViewAdminWorkspace(identity)
    ? 'Control Center'
    : identity.role === 'SUPPORT'
      ? 'Support Workspace'
      : identity.role === 'FINANCE'
        ? 'Finance Workspace'
        : identity.role === 'MODERATOR'
          ? 'Moderation Workspace'
          : 'Control Center'

  const focusSubtitle = !identity || !canViewAdminWorkspace(identity)
    ? 'Operational cockpit for marketplace, catalog, finance, content, and vendor workflows'
    : identity.role === 'SUPPORT'
      ? 'Customer conversations, returns, and open order follow-up in one view'
      : identity.role === 'FINANCE'
        ? 'Revenue, payouts, liability, and settlement pressure in one view'
        : identity.role === 'MODERATOR'
          ? 'Catalog, reviews, and content moderation queues aligned to your role'
          : 'Operational cockpit for marketplace, catalog, finance, content, and vendor workflows'

  return (
    <AdminLayout title={focusTitle} subtitle={focusSubtitle}>
      {topStats.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topStats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </div>
      ) : null}

      {canViewReports || canManageFinance ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Sales" amount={`$${data.totalSales.toFixed(2)}`} data={data.salesTrend} />
          </div>
          <div className="space-y-4">
            {canManageOrders ? <StatCard label="Complete Orders" value={String(data.completeOrders)} hint="Delivered or shipped" /> : null}
            {canManageFinance || canViewReports ? <StatCard label="Vendor Sales" value={`$${data.vendorSalesTotal.toFixed(2)}`} hint="Estimated seller share" /> : null}
            {canManageMarketing ? <StatCard label="Referred Signups" value={String(data.referredSignups)} hint="Attributed registrations" /> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Section
          title={identity?.role === 'SUPPORT' ? 'Support Queue' : identity?.role === 'FINANCE' ? 'Finance Queue' : identity?.role === 'MODERATOR' ? 'Moderation Queue' : 'Operations Queue'}
          subtitle="The main workload surfaced for the current admin role and permission set"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {data.operationsQueue.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-xl border p-4 transition hover:shadow-sm ${toneClass(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="mt-1 text-xs opacity-80">{item.description}</p>
                  </div>
                  <span className="text-2xl font-black">{item.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="Admin Shortcuts" subtitle="Direct entry points into the areas this role can actually act on">
          <div className="space-y-3 text-sm">
            {shortcuts.map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 hover:bg-slate-100">
                {shortcut.label}
              </Link>
            ))}
          </div>
        </Section>
      </div>

      {canManageOrders || canManageVendors || canManageFinance ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {canManageOrders ? (
            <div className="lg:col-span-2">
              <RecentOrdersCard orders={data.recentOrders} />
            </div>
          ) : null}
          {(canManageVendors || canManageFinance) ? (
            <Section title="Marketplace Status" subtitle="Quick operational summary for vendor and finance workflows">
              <div className="space-y-3 text-sm">
                {canManageVendors ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-slate-600">Approved vendors</span>
                    <span className="font-semibold text-slate-900">{data.totalVendors}</span>
                  </div>
                ) : null}
                {canManageFinance || canViewReports ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-slate-600">Sales contribution</span>
                    <span className="font-semibold text-slate-900">${data.vendorSalesTotal.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">Marketplace status</span>
                  <StatusBadge status="OPEN" />
                </div>
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {data.merchandisingQueue.length > 0 ? (
        <Section title="Merchandising & Marketplace Health" subtitle="Cross-domain watchlist for campaigns, fulfillment, procurement, and moderation">
          <div className="grid gap-3 md:grid-cols-2">
            {data.merchandisingQueue.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-xl border p-4 transition hover:shadow-sm ${toneClass(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="mt-1 text-xs opacity-80">{item.description}</p>
                  </div>
                  <span className="text-2xl font-black">{item.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
        ) : null}

        {data.contentQueue.length > 0 ? (
        <Section title="Content & CMS Workload" subtitle="Website tasks that still need admin attention">
          <div className="space-y-3">
            {data.contentQueue.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-xl border p-4 transition hover:shadow-sm ${toneClass(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="mt-1 text-xs opacity-80">{item.description}</p>
                  </div>
                  <span className="text-2xl font-black">{item.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
        ) : null}

        {(canManageVendors || canViewReports || canManageFinance) ? (
        <Section title="Operational Actions" subtitle="Role-aware follow-up shortcuts">
          <div className="space-y-3 text-sm">
            {canManageVendors ? (
              <Link href="/admin/vendors/procurement" className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 hover:bg-slate-100">
                Review vendor procurement queue
              </Link>
            ) : null}
            {canManageVendors ? (
              <Link href="/admin/vendors/message-center" className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 hover:bg-slate-100">
                Open vendor message center
              </Link>
            ) : null}
            {canViewReports || canManageFinance ? (
              <Link href="/admin/reports" className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 hover:bg-slate-100">
                Open marketplace reports
              </Link>
            ) : null}
          </div>
        </Section>
        ) : null}
      </div>

      {addonExtensions.dashboardWidgets.length > 0 ? (
        <div className="mt-4">
          <Section title="Addon Workspace" subtitle="Installed addons can surface their own operational entry points here">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {addonExtensions.dashboardWidgets.map((widget) => (
                <Link
                  key={`${widget.addonId}-${widget.id}`}
                  href={widget.href}
                  className={`rounded-xl border p-4 transition hover:shadow-sm ${toneClass(widget.tone ?? 'slate')}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">{widget.addonId}</p>
                  <p className="mt-2 text-sm font-bold">{widget.title}</p>
                  <p className="mt-1 text-xs opacity-80">{widget.subtitle}</p>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      ) : null}
    </AdminLayout>
  )
}
