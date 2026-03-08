import { NextResponse } from 'next/server'
import { canViewAdminWorkspace, getCurrentAdminWorkspaceIdentity, getWorkspaceSummary } from '@/lib/admin/dashboard'

export async function GET() {
  const identity = await getCurrentAdminWorkspaceIdentity()
  if (!canViewAdminWorkspace(identity)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const summary = await getWorkspaceSummary(identity ?? undefined)

  return NextResponse.json({
    totalAttention: summary.totalAttention,
    sectionBadges: summary.sectionBadges,
    pageBadges: summary.pageBadges,
    urgentItems: summary.urgentItems,
  })
}
