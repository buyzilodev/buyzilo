export type HomepageSectionId =
  | 'hero'
  | 'trustBar'
  | 'categories'
  | 'featured'
  | 'bestsellers'
  | 'newArrivals'
  | 'deals'
  | 'stores'
  | 'editorial'
  | 'recommendations'

export type HomepageHeroSlide = {
  eyebrow: string
  title: string
  subtitle: string
  href: string
  ctaLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  image?: string
  themeFrom?: string
  themeVia?: string
  themeTo?: string
}

export type HomepageFeatureCard = {
  title: string
  subtitle: string
}

export type HomepageSectionConfig = {
  id: HomepageSectionId
  label: string
  enabled: boolean
  title: string
  subtitle: string
  count: number
}

export type HomepageTemplatesConfig = {
  catalogHeroTitle: string
  catalogHeroSubtitle: string
  categoryHeroTitle: string
  categoryHeroSubtitle: string
  storesHeroTitle: string
  storesHeroSubtitle: string
  storeHeroTitle: string
  storeHeroSubtitle: string
  blogHeroTitle: string
  blogHeroSubtitle: string
  productHeroTitle: string
  productHeroSubtitle: string
}

export type HomepageConfig = {
  heroSlides: HomepageHeroSlide[]
  featureCards: HomepageFeatureCard[]
  sections: HomepageSectionConfig[]
  templates: HomepageTemplatesConfig
}

export const defaultHomepageConfig: HomepageConfig = {
  heroSlides: [
    {
      eyebrow: 'Marketplace Spotlight',
      title: 'Reimagined shopping for premium brands and marketplace sellers',
      subtitle:
        'Launch campaigns, push featured collections, highlight deals, and merchandise the storefront from one admin workspace.',
      href: '/products',
      ctaLabel: 'Shop collection',
      secondaryHref: '/register',
      secondaryLabel: 'Become a seller',
      themeFrom: '#0f172a',
      themeVia: '#1d4ed8',
      themeTo: '#0f766e',
    },
    {
      eyebrow: 'Seasonal Campaign',
      title: 'Run hero promotions like a real commerce front page',
      subtitle:
        'Drive discovery with category showcases, bestseller rails, editorial blocks, and curated destination links.',
      href: '/products?sort=newest',
      ctaLabel: 'Explore new arrivals',
      secondaryHref: '/stores',
      secondaryLabel: 'Browse stores',
      themeFrom: '#3b0764',
      themeVia: '#be185d',
      themeTo: '#7c2d12',
    },
  ],
  featureCards: [
    { title: 'Verified vendors', subtitle: 'Approved marketplace sellers and monitored fulfillment.' },
    { title: 'Secure checkout', subtitle: 'Shipping, loyalty, gift cards, and controlled payment flows.' },
    { title: 'Smart discovery', subtitle: 'Recommendations, saved searches, alerts, and rich merchandising.' },
    { title: 'Support desk', subtitle: 'Returns, tickets, call requests, and buyer communication built in.' },
  ],
  sections: [
    { id: 'hero', label: 'Hero', enabled: true, title: 'Hero campaign', subtitle: 'Primary storefront campaign area.', count: 2 },
    { id: 'trustBar', label: 'Trust bar', enabled: true, title: 'Why buy here', subtitle: 'Operational trust and value points.', count: 4 },
    { id: 'categories', label: 'Category spotlight', enabled: true, title: 'Shop by category', subtitle: 'Route buyers into top categories fast.', count: 8 },
    { id: 'featured', label: 'Featured products', enabled: true, title: 'Featured products', subtitle: 'Manually or operationally featured catalog picks.', count: 8 },
    { id: 'bestsellers', label: 'Bestsellers', enabled: true, title: 'Bestsellers this period', subtitle: 'Products ranked from actual marketplace sales.', count: 8 },
    { id: 'newArrivals', label: 'New arrivals', enabled: true, title: 'New arrivals', subtitle: 'Fresh listings approved on the marketplace.', count: 8 },
    { id: 'deals', label: 'Deals', enabled: true, title: 'Offers and markdowns', subtitle: 'Products with visible compare-at savings.', count: 8 },
    { id: 'stores', label: 'Store showcase', enabled: true, title: 'Featured stores', subtitle: 'Bring strong vendors to the front page.', count: 6 },
    { id: 'editorial', label: 'Editorial', enabled: true, title: 'From the journal', subtitle: 'Blog stories and buying inspiration.', count: 3 },
    { id: 'recommendations', label: 'Recommendations', enabled: true, title: 'Personalized recommendations', subtitle: 'Behavior-driven product rails for each buyer.', count: 1 },
  ],
  templates: {
    catalogHeroTitle: 'Discover what the marketplace is selling now',
    catalogHeroSubtitle: 'Search, compare, and refine products across trusted stores, campaigns, and curated collections.',
    categoryHeroTitle: 'Shop {category}',
    categoryHeroSubtitle: 'Explore the best products, stores, and offers in {category}.',
    storesHeroTitle: 'Explore marketplace stores',
    storesHeroSubtitle: 'Browse verified sellers, compare storefronts, and shop by specialty.',
    storeHeroTitle: 'Featured seller',
    storeHeroSubtitle: 'Discover this seller’s catalog, service profile, and current offers.',
    blogHeroTitle: 'From the journal',
    blogHeroSubtitle: 'Editorial stories, shopping ideas, and campaign highlights from the marketplace.',
    productHeroTitle: 'Product spotlight',
    productHeroSubtitle: 'Review product details, seller context, and current campaign offers before you buy.',
  },
}

export function parseHomepageConfig(raw: string | null | undefined): HomepageConfig {
  if (!raw) return defaultHomepageConfig

  try {
    const parsed = JSON.parse(raw) as Partial<HomepageConfig>
    const heroSlides = Array.isArray(parsed.heroSlides)
      ? parsed.heroSlides
          .map((slide) => ({
            eyebrow: typeof slide?.eyebrow === 'string' ? slide.eyebrow : '',
            title: typeof slide?.title === 'string' ? slide.title : '',
            subtitle: typeof slide?.subtitle === 'string' ? slide.subtitle : '',
            href: typeof slide?.href === 'string' ? slide.href : '/products',
            ctaLabel: typeof slide?.ctaLabel === 'string' ? slide.ctaLabel : 'Shop now',
            secondaryHref: typeof slide?.secondaryHref === 'string' ? slide.secondaryHref : undefined,
            secondaryLabel: typeof slide?.secondaryLabel === 'string' ? slide.secondaryLabel : undefined,
            image: typeof slide?.image === 'string' ? slide.image : undefined,
            themeFrom: typeof slide?.themeFrom === 'string' ? slide.themeFrom : undefined,
            themeVia: typeof slide?.themeVia === 'string' ? slide.themeVia : undefined,
            themeTo: typeof slide?.themeTo === 'string' ? slide.themeTo : undefined,
          }))
          .filter((slide) => slide.title.trim())
      : defaultHomepageConfig.heroSlides

    const featureCards = Array.isArray(parsed.featureCards)
      ? parsed.featureCards
          .map((card) => ({
            title: typeof card?.title === 'string' ? card.title : '',
            subtitle: typeof card?.subtitle === 'string' ? card.subtitle : '',
          }))
          .filter((card) => card.title.trim())
      : defaultHomepageConfig.featureCards

    const defaultById = new Map(defaultHomepageConfig.sections.map((section) => [section.id, section]))
    const sections: HomepageSectionConfig[] = []

    if (Array.isArray(parsed.sections)) {
      for (const entry of parsed.sections) {
        if (!entry?.id || !defaultById.has(entry.id)) continue
        const base = defaultById.get(entry.id)!
        sections.push({
          id: base.id,
          label: typeof entry.label === 'string' && entry.label.trim() ? entry.label : base.label,
          enabled: typeof entry.enabled === 'boolean' ? entry.enabled : base.enabled,
          title: typeof entry.title === 'string' && entry.title.trim() ? entry.title : base.title,
          subtitle: typeof entry.subtitle === 'string' ? entry.subtitle : base.subtitle,
          count:
            typeof entry.count === 'number' && Number.isFinite(entry.count) && entry.count > 0
              ? Math.min(24, Math.max(1, Math.round(entry.count)))
              : base.count,
        })
        defaultById.delete(base.id)
      }
    }

    defaultById.forEach((section) => sections.push(section))

    const templates = {
      catalogHeroTitle:
        typeof parsed.templates?.catalogHeroTitle === 'string' && parsed.templates.catalogHeroTitle.trim()
          ? parsed.templates.catalogHeroTitle
          : defaultHomepageConfig.templates.catalogHeroTitle,
      catalogHeroSubtitle:
        typeof parsed.templates?.catalogHeroSubtitle === 'string'
          ? parsed.templates.catalogHeroSubtitle
          : defaultHomepageConfig.templates.catalogHeroSubtitle,
      categoryHeroTitle:
        typeof parsed.templates?.categoryHeroTitle === 'string' && parsed.templates.categoryHeroTitle.trim()
          ? parsed.templates.categoryHeroTitle
          : defaultHomepageConfig.templates.categoryHeroTitle,
      categoryHeroSubtitle:
        typeof parsed.templates?.categoryHeroSubtitle === 'string'
          ? parsed.templates.categoryHeroSubtitle
          : defaultHomepageConfig.templates.categoryHeroSubtitle,
      storesHeroTitle:
        typeof parsed.templates?.storesHeroTitle === 'string' && parsed.templates.storesHeroTitle.trim()
          ? parsed.templates.storesHeroTitle
          : defaultHomepageConfig.templates.storesHeroTitle,
      storesHeroSubtitle:
        typeof parsed.templates?.storesHeroSubtitle === 'string'
          ? parsed.templates.storesHeroSubtitle
          : defaultHomepageConfig.templates.storesHeroSubtitle,
      storeHeroTitle:
        typeof parsed.templates?.storeHeroTitle === 'string' && parsed.templates.storeHeroTitle.trim()
          ? parsed.templates.storeHeroTitle
          : defaultHomepageConfig.templates.storeHeroTitle,
      storeHeroSubtitle:
        typeof parsed.templates?.storeHeroSubtitle === 'string'
          ? parsed.templates.storeHeroSubtitle
          : defaultHomepageConfig.templates.storeHeroSubtitle,
      blogHeroTitle:
        typeof parsed.templates?.blogHeroTitle === 'string' && parsed.templates.blogHeroTitle.trim()
          ? parsed.templates.blogHeroTitle
          : defaultHomepageConfig.templates.blogHeroTitle,
      blogHeroSubtitle:
        typeof parsed.templates?.blogHeroSubtitle === 'string'
          ? parsed.templates.blogHeroSubtitle
          : defaultHomepageConfig.templates.blogHeroSubtitle,
      productHeroTitle:
        typeof parsed.templates?.productHeroTitle === 'string' && parsed.templates.productHeroTitle.trim()
          ? parsed.templates.productHeroTitle
          : defaultHomepageConfig.templates.productHeroTitle,
      productHeroSubtitle:
        typeof parsed.templates?.productHeroSubtitle === 'string'
          ? parsed.templates.productHeroSubtitle
          : defaultHomepageConfig.templates.productHeroSubtitle,
    }

    return {
      heroSlides: heroSlides.length > 0 ? heroSlides : defaultHomepageConfig.heroSlides,
      featureCards: featureCards.length > 0 ? featureCards : defaultHomepageConfig.featureCards,
      sections,
      templates,
    }
  } catch {
    return defaultHomepageConfig
  }
}

export function serializeHomepageConfig(config: HomepageConfig) {
  return JSON.stringify(config)
}
