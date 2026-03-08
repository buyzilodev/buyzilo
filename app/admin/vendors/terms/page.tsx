import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminVendorSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'

export default async function AdminVendorTermsPage() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: 'vendorTermsConfig' },
  })

  return (
    <AdminLayout title="Vendor Terms" subtitle="Seller agreement content and required acceptance policy">
      <SubsectionNav items={adminVendorSubsections} />
      <SettingKeyEditor
        settingKey="vendorTermsConfig"
        label="Vendor Terms Config"
        description={'JSON config for seller terms. Example: {"enabled": true, "version": "2026-03", "title": "Vendor Terms", "summary": "Marketplace rules for sellers.", "content": "Full seller agreement text..."}'}
        multiline
        initialValue={
          setting?.value ??
          JSON.stringify(
            {
              enabled: false,
              version: '2026-03',
              title: 'Vendor Terms',
              summary: 'Marketplace rules for sellers.',
              content:
                'By creating a store, vendors agree to provide accurate product data, fulfill orders on time, and comply with marketplace policies.',
            },
            null,
            2
          )
        }
      />
    </AdminLayout>
  )
}
