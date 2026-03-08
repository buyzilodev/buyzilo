import { AdminLayout } from '@/components/AdminLayout'
import { AddonManager } from '@/components/admin/AddonManager'

export default async function AdminAddonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AdminLayout title="Addon Workspace" subtitle="Manage one addon package with the same lifecycle, diagnostics, smoke tests, runtime previews, hooks, settings, and workbench tools used across the package system">
      <AddonManager focusedAddonId={id} />
    </AdminLayout>
  )
}
