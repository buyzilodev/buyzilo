import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGiftCardAdminData, issueAdminStoreCredit, issueGiftCard } from '@/lib/actions/storeCredit'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string; id?: string } | null)?.role
  if (!session?.user || (role !== 'ADMIN' && role !== 'MANAGER')) {
    return null
  }
  return session.user as { id?: string }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const data = await getGiftCardAdminData()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json() as {
    mode?: 'gift-card' | 'credit'
    amount?: number
    note?: string
    expiresAt?: string
    userId?: string
  }
  try {
    if (body.mode === 'credit') {
      if (!body.userId) {
        return NextResponse.json({ error: 'userId required for store credit' }, { status: 400 })
      }
      const storeCredit = await issueAdminStoreCredit(body.userId, Number(body.amount ?? 0), body.note, body.expiresAt || null)
      return NextResponse.json({ success: true, storeCredit })
    }

    const giftCard = await issueGiftCard({
      amount: Number(body.amount ?? 0),
      note: body.note,
      expiresAt: body.expiresAt || null,
      issuedByUserId: admin.id,
    })
    return NextResponse.json({ success: true, giftCard })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to process request' }, { status: 400 })
  }
}
