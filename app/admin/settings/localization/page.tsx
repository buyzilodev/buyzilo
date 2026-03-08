import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminSettingsSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminSettingsLocalizationPage() {
  const [languages, currencies] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'enabledLanguages' } }),
    prisma.siteSettings.findUnique({ where: { key: 'enabledCurrencies' } }),
  ])

  return (
    <AdminLayout title="Localization" subtitle="Locale, language, and currency foundations">
      <SubsectionNav items={adminSettingsSubsections} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingKeyEditor
          settingKey="enabledLanguages"
          label="Enabled Languages"
          description="Comma-separated language codes."
          initialValue={languages?.value ?? 'en'}
        />
        <SettingKeyEditor
          settingKey="enabledCurrencies"
          label="Enabled Currencies"
          description="Comma-separated currency codes."
          initialValue={currencies?.value ?? 'USD'}
        />
      </div>
    </AdminLayout>
  )
}
