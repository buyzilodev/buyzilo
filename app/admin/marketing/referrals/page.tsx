import Link from 'next/link'
import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { StatCard } from '@/components/admin/StatCard'
import { SubsectionNav } from '@/components/admin/SubsectionNav'
import { adminMarketingSubsections } from '@/components/admin/subsections'
import { prisma } from '@/lib/prisma'
import { getAdminReferralReportData } from '@/lib/queries/admin/referrals'

export default async function AdminMarketingReferralsPage() {
  const [report, configRow] = await Promise.all([
    getAdminReferralReportData(),
    prisma.siteSettings.findUnique({ where: { key: 'referralProgramConfig' } }),
  ])

  const configValue = configRow?.value ?? JSON.stringify(report.config, null, 2)

  return (
    <AdminLayout title="Referral Program" subtitle="Control referral bonuses and review attributed signups">
      <SubsectionNav items={adminMarketingSubsections} />

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Referral Codes" value={String(report.stats.totalCodes)} hint="Buyer codes issued" />
        <StatCard label="Active Referrers" value={String(report.stats.activeCodes)} hint="Codes with at least one signup" />
        <StatCard label="Referred Signups" value={String(report.stats.totalRegistrations)} hint="Tracked registrations" />
        <StatCard label="Referrer Bonus Pts" value={String(report.stats.totalReferrerBonusPoints)} hint="Points granted to inviters" />
        <StatCard label="Friend Bonus Pts" value={String(report.stats.totalReferredBonusPoints)} hint="Points granted to referred users" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SettingKeyEditor
          settingKey="referralProgramConfig"
          label="Referral Program Config"
          description="JSON config for inviter and referred-user signup bonus points."
          multiline
          initialValue={configValue}
        />

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Current Policy</h3>
              <p className="mt-1 text-xs text-slate-500">Live referral bonus rules currently applied during registration.</p>
            </div>
            <Link href="/dashboard/referrals" className="text-xs font-semibold text-blue-600 hover:underline">
              Open Buyer View
            </Link>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              Referrer bonus: <span className="font-semibold">{report.config.referrerBonusPoints}</span> points per attributed signup.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              Referred-user bonus: <span className="font-semibold">{report.config.referredBonusPoints}</span> points on signup.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              Attribution path: <span className="font-semibold">buyer share link to /register?ref=CODE</span>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Top Referrers</h3>
            <span className="text-xs text-slate-500">Highest converted codes</span>
          </div>
          {report.topReferrers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No referral activity yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {report.topReferrers.map((entry) => (
                <div key={entry.ownerId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.ownerName || entry.ownerEmail || entry.ownerId}</p>
                      <p className="text-xs text-slate-500">{entry.code}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900">{entry.referrals} signups</p>
                      <p className="text-xs text-slate-500">{entry.totalReferrerBonusPoints} pts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Recent Referral Activity</h3>
            <span className="text-xs text-slate-500">Latest attributed registrations</span>
          </div>
          {report.recentReferrals.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No referral registrations yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Referrer</th>
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Referred Email</th>
                    <th className="pb-2">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentReferrals.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="py-2 text-slate-600">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td className="py-2 text-slate-700">{entry.ownerName || entry.ownerEmail || entry.ownerId}</td>
                      <td className="py-2 font-mono text-xs text-slate-700">{entry.code}</td>
                      <td className="py-2 text-slate-600">{entry.referredEmail}</td>
                      <td className="py-2 text-slate-700">
                        {entry.referrerBonusPoints} / {entry.referredBonusPoints} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </AdminLayout>
  )
}
