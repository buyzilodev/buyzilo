export type PublicNavLink = {
  title: string
  href: string
}

function isValidHref(value: string) {
  return value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')
}

export function parseNavigationLinks(raw: string | null | undefined, fallback: PublicNavLink[]) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as Array<{ title?: unknown; href?: unknown }>
    if (!Array.isArray(parsed)) return fallback
    const links = parsed
      .map((item) => {
        const title = typeof item.title === 'string' ? item.title.trim() : ''
        const href = typeof item.href === 'string' ? item.href.trim() : ''
        if (!title || !href || !isValidHref(href)) return null
        return { title, href }
      })
      .filter((item): item is PublicNavLink => Boolean(item))
    return links.length > 0 ? links : fallback
  } catch {
    return fallback
  }
}

export type PublicBanner = {
  title: string
  subtitle?: string
  href?: string
  background?: string
  image?: string
}

export function parseBanners(raw: string | null | undefined, fallback: PublicBanner[]) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as Array<{
      title?: unknown
      subtitle?: unknown
      href?: unknown
      background?: unknown
      image?: unknown
    }>
    if (!Array.isArray(parsed)) return fallback
    const banners = parsed
      .map((item) => {
        const title = typeof item.title === 'string' ? item.title.trim() : ''
        if (!title) return null
        return {
          title,
          subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim() : undefined,
          href: typeof item.href === 'string' && isValidHref(item.href.trim()) ? item.href.trim() : undefined,
          background: typeof item.background === 'string' ? item.background.trim() : undefined,
          image: typeof item.image === 'string' ? item.image.trim() : undefined,
        } satisfies PublicBanner
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
    return banners.length > 0 ? banners : fallback
  } catch {
    return fallback
  }
}
