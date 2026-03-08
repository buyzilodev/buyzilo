import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { appendAdvancedImportHistory, getAdvancedImportHistory, runAdvancedImport } from '@/lib/helpers/advancedImport'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const history = await getAdvancedImportHistory()
  return NextResponse.json({ history })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string; id?: string; email?: string } | null)?.role
  const actor = session?.user as { id?: string; email?: string } | undefined
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    mode?: 'categories' | 'products' | 'shopify'
    csvText?: string
    dryRun?: boolean
  }

  if (!body.mode || !body.csvText?.trim()) {
    return NextResponse.json({ error: 'mode and csvText are required' }, { status: 400 })
  }

  const result = await runAdvancedImport({
    mode: body.mode,
    csvText: body.csvText,
    dryRun: body.dryRun !== false,
  })

  if (body.dryRun === false) {
    await appendAdvancedImportHistory({
      id: `${Date.now()}`,
      mode: body.mode,
      importedAt: new Date().toISOString(),
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      totalRows: result.totalRows,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      success: result.canImport,
    })
  }

  return NextResponse.json(result)
}
