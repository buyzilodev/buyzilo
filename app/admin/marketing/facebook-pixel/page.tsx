import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminFacebookPixelPage() {
  const pixelSetting = await prisma.siteSettings.findUnique({
    where: { key: 'facebookPixelConfig' },
  })

  return (
    <AdminLayout title="Facebook Pixel" subtitle="Meta Pixel configuration for storefront tracking">
      <SubsectionNav items={adminMarketingSubsections} />

      <SettingKeyEditor
        settingKey="facebookPixelConfig"
        label="Facebook Pixel Config"
        description={'JSON config for Meta Pixel. Example: {"enabled": true, "pixelId": "1234567890", "trackPageViews": true}'}
        multiline
        initialValue={
          pixelSetting?.value ??
          JSON.stringify(
            {
              enabled: false,
              pixelId: '',
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
