import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  cancelGdprDeletion,
  exportUserPersonalData,
  getGdprConsent,
  getGdprDeletionRequest,
  requestGdprDeletion,
  updateGdprConsent,
} from '@/lib/actions/gdpr'

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; email?: string } | undefined
  return user?.id ? user : null
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get('download') === '1') {
    const payload = await exportUserPersonalData(user.id)
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="buyzilo-personal-data-${user.id}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const [consent, deletionRequest] = await Promise.all([
    getGdprConsent(user.id),
    getGdprDeletionRequest(user.id),
  ])
  return NextResponse.json({ consent, deletionRequest })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    policyAccepted?: boolean
    marketingConsent?: boolean
    analyticsConsent?: boolean
  }

  const consent = await updateGdprConsent(user.id, body)
  return NextResponse.json({ success: true, consent })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    action?: 'request_deletion' | 'cancel_deletion'
    reason?: string
  }

  if (body.action === 'cancel_deletion') {
    const request = await cancelGdprDeletion(user.id)
    return NextResponse.json({ success: true, request })
  }

  const request = await requestGdprDeletion(user.id, user.email, body.reason)
  return NextResponse.json({ success: true, request })
}
