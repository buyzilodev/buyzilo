import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireActiveAddonApi } from '@/lib/addons/guards'
import { getHelpCenterConfig, parseHelpCenterConfig, saveHelpCenterConfig } from '@/lib/actions/helpCenter'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { role?: string } | undefined
  return user?.role === 'ADMIN'
}

export async function GET() {
  const addonBlock = await requireActiveAddonApi('help_center')
  if (addonBlock) return addonBlock
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await getHelpCenterConfig())
}

export async function POST(req: Request) {
  const addonBlock = await requireActiveAddonApi('help_center')
  if (addonBlock) return addonBlock
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const config = parseHelpCenterConfig(JSON.stringify(body))
  await saveHelpCenterConfig(config)
  return NextResponse.json({ success: true, config })
}
