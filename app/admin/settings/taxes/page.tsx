import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminSettingsTaxesPage() {
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'taxRulesConfig' } })

  return (
    <AdminLayout title="Tax Settings" subtitle="Tax zones and rate configuration foundation">
      <SubsectionNav items={adminSettingsSubsections} />
      <SettingKeyEditor
        settingKey="taxRulesConfig"
        label="Tax Rules"
        description="JSON-based tax rules by region/category."
        multiline
        initialValue={setting?.value ?? JSON.stringify([{ region: 'US', rate: 8.5, inclusive: false }], null, 2)}
      />
    </AdminLayout>
  )
}
