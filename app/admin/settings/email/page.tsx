import { AdminLayout } from '@/components/AdminLayout'
import { EmailSettingsManager } from '@/components/admin/settings/StructuredSettingsManagers'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminSettingsEmailPage() {
  const [smtp, templates, sms] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'smtpConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'emailTemplatesConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'smsConfig' } }),
  ])

  return (
    <AdminLayout title="Email Settings" subtitle="SMTP and transactional email foundation">
      <SubsectionNav items={adminSettingsSubsections} />
      <EmailSettingsManager smtpValue={smtp?.value} templatesValue={templates?.value} smsValue={sms?.value} />
    </AdminLayout>
  )
}
