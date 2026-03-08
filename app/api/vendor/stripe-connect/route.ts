import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string; email?: string } | null)?.id
    const userEmail = (session?.user as { id?: string; email?: string } | null)?.email
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await req.json()
    const onboardingEmail = email || userEmail
    if (!onboardingEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const store = await prisma.store.findUnique({ where: { vendorId: userId } })
    if (!store) {
      return NextResponse.json({ error: 'Create store first' }, { status: 400 })
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: onboardingEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/payouts?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/payouts?success=true`,
      type: 'account_onboarding',
    })

    await prisma.store.update({
      where: { id: store.id },
      data: { stripeAccountId: account.id },
    })

    return NextResponse.json({
      accountId: account.id,
      url: accountLink.url
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
