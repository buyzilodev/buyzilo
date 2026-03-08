import { NextResponse } from 'next/server'
import { requireAdminApiPermission } from '@/lib/admin/api'
import { getActiveAddonExtensions, getActiveAddonHookRegistry, getActiveAddonIds, getAddonAdminPageRuntime } from '@/lib/addons/manager'

export async function GET(request: Request) {
  const access = await requireAdminApiPermission('view_dashboard')
  if (!access.ok) {
    return access.response
  }

  const { searchParams } = new URL(request.url)
  const pageHref = searchParams.get('page')

  if (pageHref) {
    const pageRuntime = await getAddonAdminPageRuntime(pageHref, access.identity)
    return NextResponse.json({
      pageRuntime,
    })
  }

  const [activeAddonIds, extensions, hookRegistry] = await Promise.all([
    getActiveAddonIds(),
    getActiveAddonExtensions({ identity: access.identity }),
    getActiveAddonHookRegistry(),
  ])

  return NextResponse.json({
    activeAddonIds,
    adminLinks: extensions.adminLinks,
    hookRegistry,
  })
}
