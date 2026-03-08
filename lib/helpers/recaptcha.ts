import { prisma } from '@/lib/prisma'

export type RecaptchaConfig = {
  enabled: boolean
  siteKey: string
  secretKey: string
  minimumScore: number
  version: 'v3'
}

export type PublicRecaptchaConfig = {
  enabled: boolean
  siteKey: string
  version: 'v3'
}

type RecaptchaVerifyResponse = {
  success?: boolean
  score?: number
  action?: string
}

const defaultConfig: RecaptchaConfig = {
  enabled: false,
  siteKey: '',
  secretKey: '',
  minimumScore: 0.5,
  version: 'v3',
}

export function parseRecaptchaConfig(raw: string | null | undefined): RecaptchaConfig {
  if (!raw) {
    return defaultConfig
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RecaptchaConfig>
    const siteKey = parsed.siteKey?.trim() ?? ''
    const secretKey = parsed.secretKey?.trim() ?? ''
    const minimumScore =
      typeof parsed.minimumScore === 'number' && Number.isFinite(parsed.minimumScore)
        ? Math.min(1, Math.max(0, parsed.minimumScore))
        : 0.5

    return {
      enabled: parsed.enabled === true && siteKey.length > 0 && secretKey.length > 0,
      siteKey,
      secretKey,
      minimumScore,
      version: 'v3',
    }
  } catch {
    return defaultConfig
  }
}

export function toPublicRecaptchaConfig(config: RecaptchaConfig): PublicRecaptchaConfig {
  return {
    enabled: config.enabled,
    siteKey: config.siteKey,
    version: config.version,
  }
}

export async function getRecaptchaConfig() {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'recaptchaConfig' },
  })

  return parseRecaptchaConfig(row?.value)
}

export async function verifyRecaptchaToken(token: string | null | undefined, action?: string) {
  const config = await getRecaptchaConfig()

  if (!config.enabled) {
    return { ok: true as const, config }
  }

  if (!token || token.trim().length === 0) {
    return {
      ok: false as const,
      config,
      message: 'Captcha verification is required.',
    }
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: config.secretKey,
        response: token,
      }),
      cache: 'no-store',
    })

    const result = (await response.json()) as RecaptchaVerifyResponse
    const matchesAction = !action || !result.action || result.action === action
    const meetsScore = typeof result.score !== 'number' || result.score >= config.minimumScore

    if (response.ok && result.success === true && matchesAction && meetsScore) {
      return { ok: true as const, config }
    }

    return {
      ok: false as const,
      config,
      message: 'Captcha verification failed.',
    }
  } catch {
    return {
      ok: false as const,
      config,
      message: 'Captcha verification failed.',
    }
  }
}
