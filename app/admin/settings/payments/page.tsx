import { AdminLayout } from '@/components/AdminLayout'
import { PaymentSettingsManager } from '@/components/admin/settings/StructuredSettingsManagers'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminSettingsPaymentsPage() {
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'paymentMethodsConfig' } })

  return (
    <AdminLayout title="Payment Methods" subtitle="Configure active payment methods and checkout behavior">
      <SubsectionNav items={adminSettingsSubsections} />
      <PaymentSettingsManager initialValue={setting?.value} />
    </AdminLayout>
  )
}
