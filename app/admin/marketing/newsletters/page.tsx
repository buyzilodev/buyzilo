import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { EmailMarketingManager } from '@/components/admin/EmailMarketingManager'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { getEmailMarketingStats } from '@/lib/actions/emailMarketing'
import { prisma } from '@/lib/prisma'
import { getBuyerDigestAutomationStats } from '@/lib/actions/buyerDigestDelivery'

export default async function AdminMarketingNewslettersPage() {
  const [templateSetting, automationSetting, digestAutomation, digestStats, marketingStats] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'newsletterTemplate' } }),
    prisma.siteSettings.findUnique({ where: { key: 'newsletterAutomationConfig' } }),
    prisma.siteSettings.findUnique({ where: { key: 'buyerDigestAutomationConfig' } }),
    getBuyerDigestAutomationStats(),
    getEmailMarketingStats(),
  ])

  return (
    <AdminLayout title="Newsletters" subtitle="Email campaign foundation and template controls">
      <SubsectionNav items={adminMarketingSubsections} />
      <div className="grid gap-4 lg:grid-cols-3">
        <SettingKeyEditor
          settingKey="newsletterTemplate"
          label="Newsletter Template"
          description="Default HTML/Markdown newsletter template."
          multiline
          initialValue={templateSetting?.value ?? '## Buyzilo Weekly Highlights'}
        />
        <SettingKeyEditor
          settingKey="newsletterAutomationConfig"
          label="Automation Config"
          description="Campaign scheduling and segmentation options in JSON."
          multiline
          initialValue={automationSetting?.value ?? JSON.stringify({ enabled: false, cadence: 'weekly' }, null, 2)}
        />
        <SettingKeyEditor
          settingKey="buyerDigestAutomationConfig"
          label="Buyer Digest Automation"
          description="JSON config for buyer digest email delivery. Admin batch endpoint respects this."
          multiline
          initialValue={
            digestAutomation?.value ?? JSON.stringify({ enabled: false, respectUserFrequency: true, dailySendHourUtc: 9 }, null, 2)
          }
        />
      </div>

      <div className="mt-4">
        <EmailMarketingManager
          stats={{
            buyers: marketingStats.buyers,
            consentedBuyers: marketingStats.consentedBuyers,
            recentBuyers30d: marketingStats.recentBuyers30d,
            loyaltyAudience: marketingStats.loyaltyAudience,
          }}
          campaigns={marketingStats.campaigns}
        />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Buyer Digest Delivery</h3>
            <p className="mt-1 text-xs text-slate-500">Use the admin digest API to run a batch send for currently eligible buyers.</p>
          </div>
          <Link href="/dashboard/digest" className="text-xs font-semibold text-blue-600 hover:underline">
            Open Buyer Digest
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Buyer Accounts</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{digestStats.stats.totalBuyers}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Daily Digest Users</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{digestStats.stats.dailyUsers}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Weekly Digest Users</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{digestStats.stats.weeklyUsers}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-500">Eligible Now</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{digestStats.stats.eligibleNow}</p>
          </article>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="pb-2">Buyer</th>
                <th className="pb-2">Frequency</th>
                <th className="pb-2">Last Sent</th>
                <th className="pb-2">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {digestStats.users.slice(0, 12).map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{user.name || user.email}</td>
                  <td className="py-2 text-slate-600">{user.digestFrequency}</td>
                  <td className="py-2 text-slate-600">{user.lastSentAt ? new Date(user.lastSentAt).toLocaleString() : 'Never'}</td>
                  <td className="py-2 text-slate-600">{user.eligible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
