import { AdminLayout } from '@/components/AdminLayout'
import { ShippingSettingsManager } from '@/components/admin/settings/StructuredSettingsManagers'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminSettingsShippingPage() {
  const [zones, methods] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'shippingZonesConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'shippingMethodsConfig' } }),
  ])

  return (
    <AdminLayout title="Shipping Settings" subtitle="Manage zones, methods, and shipment defaults">
      <SubsectionNav items={adminSettingsSubsections} />
      <ShippingSettingsManager initialZones={zones?.value} initialMethods={methods?.value} />
    </AdminLayout>
  )
}
