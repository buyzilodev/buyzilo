import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { Section } from '@/components/admin/Section'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminCustomerSubsections } from '@/components/admin/subsections'
import { TableShell } from '@/components/admin/TableShell'
import { requireAdminPermission } from '@/lib/admin/guards'
import { getAdminUsers } from '@/lib/queries/admin/management'

type AdminCustomersPageProps = {
  searchParams?: {
    role?: string
  }
}

const userRoles = ['BUYER', 'VENDOR', 'ADMIN', 'MANAGER', 'SUPPORT', 'FINANCE', 'MODERATOR']

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  await requireAdminPermission('manage_users')
  const role = searchParams?.role
  const data = await getAdminUsers(role)

  const buyers = data.users.filter((user) => user.role === 'BUYER').length
  const vendors = data.users.filter((user) => user.role === 'VENDOR').length
  const admins = data.users.filter((user) => user.role === 'ADMIN' || user.role === 'MANAGER').length
  const privacyAttention = data.users.filter((user) => user.gdprStatus === 'REQUESTED').length

  return (
    <AdminLayout title="Customers & Users" subtitle="Inspect user accounts and role distribution">
      <SubsectionNav items={adminCustomerSubsections} />

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Visible Users" value={String(data.users.length)} hint={`Total matched: ${data.total}`} />
        <StatCard label="Buyers" value={String(buyers)} hint="Customer accounts" />
        <StatCard label="Vendors" value={String(vendors)} hint="Seller accounts" />
        <StatCard label="Admins" value={String(admins)} hint="Admin and manager roles" />
        <StatCard label="Privacy Attention" value={String(privacyAttention)} hint="Deletion requests awaiting action" />
      </div>

      <div className="mt-4">
        <Section title="Customer Operations" subtitle="Fast entry points for service, privacy, and account segmentation">
          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/admin/customers/message-center" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              Message center
            </Link>
            <Link href="/admin/customers/privacy" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              Privacy queue
            </Link>
            <Link href="/admin/customers/user-groups" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              User groups
            </Link>
            <Link href="/admin/managers" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              Admin team
            </Link>
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="User Directory" subtitle="Filter by role and review account details">
          <form method="GET" className="mb-3">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Role
              <select name="role" defaultValue={role ?? ''} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs">
                <option value="">All</option>
                {userRoles.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                Apply
              </button>
              {role && (
                <Link href="/admin/customers" className="text-xs text-blue-600 hover:underline">
                  Clear
                </Link>
              )}
            </label>
          </form>

          <TableShell title="Users" subtitle="Role and account overview">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Account Signals</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-3 text-slate-800">
                      <Link href={`/admin/customers/${user.id}`} className="font-medium text-blue-600 hover:underline">
                        {user.name ?? 'Unnamed User'}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-700">{user.email}</td>
                    <td className="py-3"><StatusBadge status={user.role} /></td>
                    <td className="py-3">
                      <div className="flex max-w-72 flex-wrap gap-2">
                        {user.orderCount > 0 ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            Orders {user.orderCount}
                          </span>
                        ) : null}
                        {user.supportCount > 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            Support {user.supportCount}
                          </span>
                        ) : null}
                        {user.returnCount > 0 ? (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                            Returns {user.returnCount}
                          </span>
                        ) : null}
                        {user.gdprStatus ? (
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${user.gdprStatus === 'REQUESTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                            GDPR {user.gdprStatus}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/customers/${user.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Open
                        </Link>
                        {user.supportCount > 0 ? (
                          <Link href="/admin/customers/message-center" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                            Messages
                          </Link>
                        ) : null}
                        {user.gdprStatus === 'REQUESTED' ? (
                          <Link href="/admin/customers/privacy" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                            Privacy
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.users.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No users found.</p>}
          </TableShell>
        </Section>
      </div>
    </AdminLayout>
  )
}
