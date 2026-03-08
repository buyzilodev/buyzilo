import { AdminLayout } from '@/components/AdminLayout'
import { SecuritySettingsManager } from '@/components/admin/settings/StructuredSettingsManagers'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminSettingsSecurityPage() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: 'recaptchaConfig' },
  })

  return (
    <AdminLayout title="Security Settings" subtitle="Anonymous form protection and captcha policy">
      <SubsectionNav items={adminSettingsSubsections} />
      <SecuritySettingsManager initialValue={setting?.value} />
    </AdminLayout>
  )
}
