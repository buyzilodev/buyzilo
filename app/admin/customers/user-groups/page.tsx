import { AdminLayout } from '@/components/AdminLayout'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminCustomerSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminUserGroupsPage() {
  const groups = await prisma.userGroup
    .findMany({
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    .catch(() => [])

  return (
    <AdminLayout title="User Groups" subtitle="Manage buyer segmentation and permission bundles">
      <SubsectionNav items={adminCustomerSubsections} />

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Groups</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-2">Group</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Members</th>
                <th className="pb-2">Permissions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-700">{group.name}</td>
                  <td className="py-2 text-slate-600">{group.description ?? '-'}</td>
                  <td className="py-2 text-slate-700">{group._count.members}</td>
                  <td className="py-2 text-xs text-slate-500">{group.permissions.length ? group.permissions.join(', ') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No user groups configured yet. This module is ready for segmentation rollout.
            </p>
          )}
        </div>
      </article>
    </AdminLayout>
  )
}
