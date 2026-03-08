import { AdminLayout } from '@/components/AdminLayout'
import { DataFeedsManager } from '@/components/admin/DataFeedsManager'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { getProductFeedItems, parseProductFeedConfig, parseProductFeedRunState } from '@/lib/helpers/dataFeeds'
import { prisma } from '@/lib/prisma'

export default async function AdminMarketingDataFeedsPage() {
  const [feedSetting, lastRunSetting] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'productFeedConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'productFeedLastRun' } }),
  ])
  const config = parseProductFeedConfig(feedSetting?.value)
  const items = await getProductFeedItems(config)
  const lastRun = parseProductFeedRunState(lastRunSetting?.value)

  return (
    <AdminLayout title="Data Feeds" subtitle="Export and feed configuration for channels">
      <SubsectionNav items={adminMarketingSubsections} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingKeyEditor
          settingKey="productFeedConfig"
          label="Feed Providers"
          description="Enable live product feeds and destination defaults as JSON."
          multiline
          initialValue={feedSetting?.value ?? JSON.stringify({ googleMerchant: false, metaCatalog: false, currency: 'USD', country: 'US', includeOutOfStock: false }, null, 2)}
        />
        <SettingKeyEditor
          settingKey="productFeedLastRun"
          label="Last Export Metadata"
          description="Stored feed run history. Usually updated by the run buttons below."
          multiline
          initialValue={lastRunSetting?.value ?? JSON.stringify({ lastRunAt: null, status: 'idle' }, null, 2)}
        />
      </div>
      <div className="mt-4">
        <DataFeedsManager
          itemCount={items.length}
          providers={{
            'google-merchant': { enabled: config.googleMerchant, format: 'xml', url: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')}/feeds/google-merchant` },
            'meta-catalog': { enabled: config.metaCatalog, format: 'csv', url: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')}/feeds/meta-catalog` },
          }}
          initialLastRun={lastRun}
        />
      </div>
    </AdminLayout>
  )
}
