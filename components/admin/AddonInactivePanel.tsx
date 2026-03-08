'use client'

import Link from 'next/link'

export function AddonInactivePanel({
  addonId,
  title,
  description,
}: {
  addonId: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <p className="mt-2 text-sm text-slate-500">
        Activate the <span className="font-semibold text-slate-700">`{addonId}`</span> package in the addon manager to reopen this workspace.
      </p>
      <Link href="/admin/addons" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        Open addon manager
      </Link>
    </div>
  )
}
