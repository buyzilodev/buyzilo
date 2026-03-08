import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStoreCreditSummary, issueGiftCertificateFromBalance, listUserGiftCertificates, redeemGiftCard } from '@/lib/actions/storeCredit'

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | null)?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [storeCredit, certificates] = await Promise.all([
    getStoreCreditSummary(userId),
    listUserGiftCertificates(userId),
  ])
  return NextResponse.json({ storeCredit, certificates })
}

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json() as {
    action?: 'redeem' | 'send-certificate'
    code?: string
    amount?: number
    senderName?: string
    recipientName?: string
    recipientEmail?: string
    personalMessage?: string
  }
  try {
    if (body.action === 'send-certificate') {
      if (!body.amount || !body.senderName || !body.recipientName || !body.recipientEmail) {
        return NextResponse.json({ error: 'Amount, sender name, recipient name, and recipient email are required' }, { status: 400 })
      }
      const certificate = await issueGiftCertificateFromBalance({
        userId,
        amount: Number(body.amount),
        senderName: body.senderName,
        recipientName: body.recipientName,
        recipientEmail: body.recipientEmail,
        personalMessage: body.personalMessage,
      })
      const [storeCredit, certificates] = await Promise.all([
        getStoreCreditSummary(userId),
        listUserGiftCertificates(userId),
      ])
      return NextResponse.json({ success: true, certificate, storeCredit, certificates })
    }

    if (!body.code) {
      return NextResponse.json({ error: 'Gift card code required' }, { status: 400 })
    }
    const storeCredit = await redeemGiftCard(userId, body.code)
    const certificates = await listUserGiftCertificates(userId)
    return NextResponse.json({ success: true, storeCredit, certificates })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to redeem gift card' }, { status: 400 })
  }
}
