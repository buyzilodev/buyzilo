import type { Metadata } from 'next'

export function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function toKeywords(value?: string | null) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildSeoMetadata(input: {
  title: string
  description: string
  path: string
  image?: string | null
  keywords?: string[]
  noIndex?: boolean
}): Metadata {
  const baseUrl = getBaseUrl()
  const canonical = `${baseUrl}${input.path.startsWith('/') ? input.path : `/${input.path}`}`

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords?.length ? input.keywords : undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      type: 'website',
      images: input.image ? [{ url: input.image }] : undefined,
    },
    twitter: {
      card: input.image ? 'summary_large_image' : 'summary',
      title: input.title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
  }
}
