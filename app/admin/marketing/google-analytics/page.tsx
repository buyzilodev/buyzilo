import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminGoogleAnalyticsPage() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: 'googleAnalyticsConfig' },
  })

  return (
    <AdminLayout title="Google Analytics" subtitle="GA4 storefront measurement configuration">
      <SubsectionNav items={adminMarketingSubsections} />

      <SettingKeyEditor
        settingKey="googleAnalyticsConfig"
        label="Google Analytics Config"
        description={'JSON config for GA4. Example: {"enabled": true, "measurementId": "G-XXXXXXXXXX", "trackPageViews": true}'}
        multiline
        initialValue={
          setting?.value ??
          JSON.stringify(
            {
              enabled: false,
              measurementId: '',
              trackPageViews: true,
            },
            null,
            2
          )
        }
      />
    </AdminLayout>
  )
}
