import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'
import { registerSchema } from '@/lib/validators/auth'
import { applyReferralOnRegistration } from '@/lib/actions/referrals'
import { verifyRecaptchaToken } from '@/lib/helpers/recaptcha'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid registration data' }, { status: 400 })
    }

    const { name, email, password, referralCode, recaptchaToken } = parsed.data

    const captchaCheck = await verifyRecaptchaToken(recaptchaToken, 'register')
    if (!captchaCheck.ok) {
      return NextResponse.json({ error: captchaCheck.message }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'BUYER'
      }
    })

    try {
      await sendWelcomeEmail({ to: email, name })
    } catch {
      console.log('Welcome email failed to send')
    }

    await applyReferralOnRegistration({
      referralCode,
      newUserId: user.id,
      newUserEmail: user.email,
    })

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
