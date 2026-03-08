import { AdminLayout } from '@/components/AdminLayout'
import { AddonManager } from '@/components/admin/AddonManager'

export default async function AdminAddonsPage() {
  return (
    <AdminLayout title="Add-ons & Integrations" subtitle="Browse the package registry, then open each addon to manage lifecycle, diagnostics, hooks, settings, and runtime behavior">
      <AddonManager />
    </AdminLayout>
  )
}
