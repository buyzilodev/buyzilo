import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getEmailMarketingAudience,
  getEmailMarketingStats,
  recordEmailCampaign,
  renderEmailCampaignHtml,
  type EmailMarketingSegment,
} from '@/lib/actions/emailMarketing'
import { sendMarketingCampaignEmail } from '@/lib/email'

function isAdminRole(role?: string) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | null)?.role
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stats = await getEmailMarketingStats()
  return NextResponse.json(stats)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | null
  if (!user?.id || !isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    subject?: string
    previewText?: string
    body?: string
    segment?: EmailMarketingSegment
    mode?: 'test' | 'send'
    testEmail?: string
  }

  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  const segment: EmailMarketingSegment =
    body.segment === 'recent-buyers-30d' || body.segment === 'loyalty-members'
      ? body.segment
      : 'marketing-consented'

  const html = renderEmailCampaignHtml({
    subject: body.subject.trim(),
    previewText: body.previewText?.trim() || null,
    body: body.body,
  })

  if (body.mode === 'test') {
    if (!body.testEmail?.trim()) {
      return NextResponse.json({ error: 'Test email is required' }, { status: 400 })
    }
    await sendMarketingCampaignEmail({
      to: body.testEmail.trim(),
      subject: `[Test] ${body.subject.trim()}`,
      html,
    })
    const record = await recordEmailCampaign({
      subject: body.subject.trim(),
      previewText: body.previewText?.trim() || null,
      body: body.body,
      segment,
      recipientCount: 1,
      actorId: user.id,
      testEmail: body.testEmail.trim(),
    })
    return NextResponse.json({ success: true, campaign: record, test: true })
  }

  const recipients = await getEmailMarketingAudience(segment)
  for (const recipient of recipients) {
    await sendMarketingCampaignEmail({
      to: recipient.email!,
      subject: body.subject.trim(),
      html,
    })
  }

  const record = await recordEmailCampaign({
    subject: body.subject.trim(),
    previewText: body.previewText?.trim() || null,
    body: body.body,
    segment,
    recipientCount: recipients.length,
    actorId: user.id,
    testEmail: null,
  })

  return NextResponse.json({ success: true, campaign: record, recipientCount: recipients.length })
}
