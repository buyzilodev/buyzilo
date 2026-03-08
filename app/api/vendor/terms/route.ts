import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { acceptVendorTerms, getVendorTermsStatus } from '@/lib/actions/vendorTerms'

async function getVendorUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getVendorUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getVendorTermsStatus(userId)
  return NextResponse.json(status)
}

export async function POST(req: Request) {
  const userId = await getVendorUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { version?: string }
  const status = await getVendorTermsStatus(userId)
  if (!status.config.enabled) {
    return NextResponse.json({ success: true, acceptance: null, status })
  }

  if (body.version !== status.config.version) {
    return NextResponse.json({ error: 'Vendor terms version mismatch' }, { status: 400 })
  }

  const acceptance = await acceptVendorTerms(userId, status.config.version)
  return NextResponse.json({
    success: true,
    acceptance,
    status: {
      ...status,
      acceptance,
      isCurrentAccepted: true,
    },
  })
}
