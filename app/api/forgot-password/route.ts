import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { verifyRecaptchaToken } from '@/lib/helpers/recaptcha'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  recaptchaToken: z.string().trim().min(1).optional(),
})

export async function POST(req: Request) {
  const parsed = forgotPasswordSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const captchaCheck = await verifyRecaptchaToken(parsed.data.recaptchaToken, 'forgot_password')
  if (!captchaCheck.ok) {
    return NextResponse.json({ error: captchaCheck.message }, { status: 400 })
  }

  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    console.info(`Password reset requested for: ${email}`)
  }

  return NextResponse.json({
    success: true,
    message: 'If an account exists for this email, a reset link would be sent.',
  })
}
