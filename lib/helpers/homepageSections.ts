export type HomepageSectionId =
  | 'hero'
  | 'categories'
  | 'interest'
  | 'popular'
  | 'promoCards'
  | 'promoGrid'
  | 'news'
  | 'shopNow'

export type HomepageSectionConfig = {
  id: HomepageSectionId
  label: string
  enabled: boolean
}

export const defaultHomepageSections: HomepageSectionConfig[] = [
  { id: 'hero', label: 'Hero Banner', enabled: true },
  { id: 'categories', label: 'Categories Grid', enabled: true },
  { id: 'interest', label: 'Possibly You May Be Interested', enabled: true },
  { id: 'popular', label: 'Most Popular This Month', enabled: true },
  { id: 'promoCards', label: 'Promo Category Cards', enabled: true },
  { id: 'promoGrid', label: 'Current Promotions Grid', enabled: true },
  { id: 'news', label: 'Latest News Section', enabled: true },
  { id: 'shopNow', label: 'Shop Now Grid', enabled: true },
]

export function parseHomepageSections(raw: string | null | undefined): HomepageSectionConfig[] {
  if (!raw) return defaultHomepageSections

  try {
    const parsed = JSON.parse(raw) as Array<Partial<HomepageSectionConfig>>
    if (!Array.isArray(parsed)) return defaultHomepageSections

    const byId = new Map(defaultHomepageSections.map((section) => [section.id, section]))
    const normalized: HomepageSectionConfig[] = []

    parsed.forEach((entry) => {
      if (!entry.id || !byId.has(entry.id as HomepageSectionId)) return
      const base = byId.get(entry.id as HomepageSectionId)!
      normalized.push({
        id: base.id,
        label: typeof entry.label === 'string' && entry.label.trim() ? entry.label : base.label,
        enabled: typeof entry.enabled === 'boolean' ? entry.enabled : base.enabled,
      })
      byId.delete(base.id)
    })

    byId.forEach((remaining) => normalized.push(remaining))
    return normalized
  } catch {
    return defaultHomepageSections
  }
}

export function serializeHomepageSections(sections: HomepageSectionConfig[]) {
  return JSON.stringify(sections)
}
