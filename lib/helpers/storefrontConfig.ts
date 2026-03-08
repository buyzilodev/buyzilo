export type StorefrontMenuItem = {
  title: string
  href: string
  highlight?: boolean
  children?: Array<{
    title: string
    href: string
  }>
}

export type StorefrontFooterColumn = {
  title: string
  links: Array<{
    title: string
    href: string
  }>
}

export type StorefrontBannerCard = {
  id?: string
  title: string
  subtitle: string
  href: string
  image?: string
  tone?: string
  placementPages?: string[]
  placementQuery?: string
  featuredCategory?: string
  priority?: number
  isActive?: boolean
  startsAt?: string
  endsAt?: string
}

export type StorefrontDiscoveryRoute = {
  title: string
  href: string
  description: string
}

export type StorefrontSearchPromotion = {
  query: string
  title: string
  href: string
  description: string
}

export type StorefrontIntentPreset = {
  slug: string
  title: string
  subtitle: string
  href: string
  pages?: string[]
  tone?: string
}

export type StorefrontCampaign = {
  slug: string
  eyebrow: string
  title: string
  subtitle: string
  body: string
  ctaLabel: string
  ctaHref: string
  image?: string
  themeFrom?: string
  themeVia?: string
  themeTo?: string
  featuredCategory?: string
  placementPages?: string[]
  placementQuery?: string
  priority?: number
}

export type StorefrontTemplates = {
  announcementText: string
  announcementHref: string
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

export type StorefrontConfig = {
  headerMenu: StorefrontMenuItem[]
  footerColumns: StorefrontFooterColumn[]
  bannerCards: StorefrontBannerCard[]
  discoveryRoutes: StorefrontDiscoveryRoute[]
  searchPromotions: StorefrontSearchPromotion[]
  intentPresets: StorefrontIntentPreset[]
  campaigns: StorefrontCampaign[]
  templates: StorefrontTemplates
}

export const defaultStorefrontConfig: StorefrontConfig = {
  headerMenu: [
    {
      title: 'Products',
      href: '/products',
      children: [
        { title: 'New Arrivals', href: '/products?sort=newest' },
        { title: 'Deals', href: '/products?maxPrice=100' },
      ],
    },
    { title: 'Stores', href: '/stores' },
    { title: 'Blog', href: '/blog' },
    { title: 'Gift Cards', href: '/dashboard/store-credit', highlight: true },
  ],
  footerColumns: [
    {
      title: 'Shop',
      links: [
        { title: 'All products', href: '/products' },
        { title: 'Stores', href: '/stores' },
        { title: 'Compare', href: '/compare' },
      ],
    },
    {
      title: 'Customer care',
      links: [
        { title: 'Support', href: '/dashboard/support' },
        { title: 'Orders', href: '/dashboard/orders' },
        { title: 'Alerts', href: '/dashboard/stock-alerts' },
      ],
    },
    {
      title: 'Company',
      links: [
        { title: 'Blog', href: '/blog' },
        { title: 'Sell on Buyzilo', href: '/register' },
        { title: 'Privacy policy', href: '/pages/privacy-policy' },
      ],
    },
  ],
  bannerCards: [
    { id: 'marketplace-deals', title: 'Marketplace deals', subtitle: 'Curated price drops and seasonal campaigns.', href: '/products', tone: 'blue', placementPages: ['home', 'search', 'cart'], priority: 40, isActive: true },
    { id: 'top-rated-stores', title: 'Top-rated stores', subtitle: 'Browse approved vendors with live storefronts.', href: '/stores', tone: 'amber', placementPages: ['home', 'search', 'store'], priority: 30, isActive: true },
    { id: 'buyer-rewards', title: 'Buyer rewards', subtitle: 'Loyalty, referrals, gift cards, and store credit.', href: '/dashboard/rewards', tone: 'emerald', placementPages: ['account', 'checkout', 'order-success'], priority: 35, isActive: true },
  ],
  discoveryRoutes: [
    { title: 'Trending products', href: '/products?sort=newest', description: 'Fresh approved listings and new arrivals.' },
    { title: 'Top stores', href: '/stores', description: 'Browse approved marketplace storefronts.' },
    { title: 'Deals under $100', href: '/products?maxPrice=100', description: 'Lower-price discovery route for deal shoppers.' },
    { title: 'Compare products', href: '/compare', description: 'Review pricing, store, and stock side by side.' },
  ],
  searchPromotions: [
    { query: 'deal', title: 'Deals and markdowns', href: '/products?maxPrice=100', description: 'Jump straight into current low-price discovery routes.' },
    { query: 'gift', title: 'Gift cards and store credit', href: '/dashboard/store-credit', description: 'Explore giftable balances, store credit, and rewards.' },
    { query: 'vendor', title: 'Browse top stores', href: '/stores', description: 'Open the vendor directory and discover approved sellers.' },
  ],
  intentPresets: [
    { slug: 'deal-hunter', title: 'Deal Hunter', subtitle: 'Jump to markdowns, bundles, and lower-price discovery.', href: '/products?maxPrice=100', pages: ['search', 'cart'], tone: 'amber' },
    { slug: 'gift-buyer', title: 'Gift Buyer', subtitle: 'Use gift cards, curated products, and buyer rewards together.', href: '/dashboard/store-credit', pages: ['search', 'checkout', 'account'], tone: 'rose' },
    { slug: 'repeat-buyer', title: 'Repeat Buyer', subtitle: 'Return to saved searches, alerts, and fast reorder paths.', href: '/dashboard', pages: ['account', 'order-success'], tone: 'blue' },
  ],
  campaigns: [
    {
      slug: 'summer-edit',
      eyebrow: 'Seasonal Campaign',
      title: 'Summer edit',
      subtitle: 'A curated landing page for fresh arrivals, deals, and standout marketplace stores.',
      body: 'Build real campaign destinations from admin without hardcoding pages. Route traffic into categories, products, and editorial content.',
      ctaLabel: 'Shop summer picks',
      ctaHref: '/products',
      featuredCategory: '',
      themeFrom: '#0f172a',
      themeVia: '#2563eb',
      themeTo: '#f59e0b',
      placementPages: ['home', 'search', 'store'],
      placementQuery: '',
      priority: 50,
    },
  ],
  templates: {
    announcementText: 'Free shipping on orders over $100',
    announcementHref: '/products',
    catalogHeroTitle: 'Marketplace catalog built for discovery',
    catalogHeroSubtitle: 'Search, compare, filter, save, and shop across approved marketplace products.',
    categoryHeroTitle: 'Curated category landing for {category}',
    categoryHeroSubtitle: 'Browse approved products, featured picks, and related discovery paths inside {category}.',
    storesHeroTitle: 'Store directory for trusted marketplace vendors',
    storesHeroSubtitle: 'Discover approved storefronts, physical locations, contact data, and active assortments.',
    storeHeroTitle: 'Vendor storefronts with real marketplace depth',
    storeHeroSubtitle: 'Browse trusted stores, merchant details, approved assortments, and live operations in one place.',
    blogHeroTitle: 'Editorial commerce, marketplace news, and buying guides',
    blogHeroSubtitle: 'Turn the blog into a branded storefront content surface instead of a plain article list.',
    productHeroTitle: 'Product detail built for confident buying',
    productHeroSubtitle: 'Compare, review, bundle, and buy with richer merchandising and vendor context.',
  },
}

function safeHref(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function parseStorefrontConfig(raw: string | null | undefined): StorefrontConfig {
  if (!raw) return defaultStorefrontConfig

  try {
    const parsed = JSON.parse(raw) as Partial<StorefrontConfig>

    const headerMenu = Array.isArray(parsed.headerMenu)
      ? parsed.headerMenu
          .map((item) => ({
            title: typeof item?.title === 'string' ? item.title : '',
            href: safeHref(item?.href, '/'),
            highlight: Boolean(item?.highlight),
            children: Array.isArray(item?.children)
              ? item.children
                  .map((child) => ({
                    title: typeof child?.title === 'string' ? child.title : '',
                    href: safeHref(child?.href, '/'),
                  }))
                  .filter((child) => child.title.trim())
              : [],
          }))
          .filter((item) => item.title.trim())
      : defaultStorefrontConfig.headerMenu

    const footerColumns = Array.isArray(parsed.footerColumns)
      ? parsed.footerColumns
          .map((column) => ({
            title: typeof column?.title === 'string' ? column.title : '',
            links: Array.isArray(column?.links)
              ? column.links
                  .map((link) => ({
                    title: typeof link?.title === 'string' ? link.title : '',
                    href: safeHref(link?.href, '/'),
                  }))
                  .filter((link) => link.title.trim())
              : [],
          }))
          .filter((column) => column.title.trim() && column.links.length > 0)
      : defaultStorefrontConfig.footerColumns

    const bannerCards = Array.isArray(parsed.bannerCards)
      ? parsed.bannerCards
          .map((banner) => ({
            title: typeof banner?.title === 'string' ? banner.title : '',
            subtitle: typeof banner?.subtitle === 'string' ? banner.subtitle : '',
            href: safeHref(banner?.href, '/products'),
            id: typeof banner?.id === 'string' ? banner.id : undefined,
            image: typeof banner?.image === 'string' ? banner.image : undefined,
            tone: typeof banner?.tone === 'string' ? banner.tone : undefined,
            placementPages: Array.isArray(banner?.placementPages)
              ? banner.placementPages.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
              : [],
            placementQuery: typeof banner?.placementQuery === 'string' ? banner.placementQuery : undefined,
            featuredCategory: typeof banner?.featuredCategory === 'string' ? banner.featuredCategory : undefined,
            priority: typeof banner?.priority === 'number' ? banner.priority : 0,
            isActive: typeof banner?.isActive === 'boolean' ? banner.isActive : true,
            startsAt: typeof banner?.startsAt === 'string' ? banner.startsAt : undefined,
            endsAt: typeof banner?.endsAt === 'string' ? banner.endsAt : undefined,
          }))
          .filter((banner) => banner.title.trim())
      : defaultStorefrontConfig.bannerCards

    const discoveryRoutes = Array.isArray(parsed.discoveryRoutes)
      ? parsed.discoveryRoutes
          .map((route) => ({
            title: typeof route?.title === 'string' ? route.title : '',
            href: safeHref(route?.href, '/products'),
            description: typeof route?.description === 'string' ? route.description : '',
          }))
          .filter((route) => route.title.trim())
      : defaultStorefrontConfig.discoveryRoutes

    const searchPromotions = Array.isArray(parsed.searchPromotions)
      ? parsed.searchPromotions
          .map((promotion) => ({
            query: typeof promotion?.query === 'string' ? promotion.query : '',
            title: typeof promotion?.title === 'string' ? promotion.title : '',
            href: safeHref(promotion?.href, '/products'),
            description: typeof promotion?.description === 'string' ? promotion.description : '',
          }))
          .filter((promotion) => promotion.query.trim() && promotion.title.trim())
      : defaultStorefrontConfig.searchPromotions

    const intentPresets = Array.isArray(parsed.intentPresets)
      ? parsed.intentPresets
          .map((preset) => ({
            slug: typeof preset?.slug === 'string' ? preset.slug : '',
            title: typeof preset?.title === 'string' ? preset.title : '',
            subtitle: typeof preset?.subtitle === 'string' ? preset.subtitle : '',
            href: safeHref(preset?.href, '/products'),
            pages: Array.isArray(preset?.pages)
              ? preset.pages.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
              : [],
            tone: typeof preset?.tone === 'string' ? preset.tone : undefined,
          }))
          .filter((preset) => preset.slug.trim() && preset.title.trim())
      : defaultStorefrontConfig.intentPresets

    const campaigns = Array.isArray(parsed.campaigns)
      ? parsed.campaigns
          .map((campaign) => ({
            slug: typeof campaign?.slug === 'string' ? campaign.slug : '',
            eyebrow: typeof campaign?.eyebrow === 'string' ? campaign.eyebrow : '',
            title: typeof campaign?.title === 'string' ? campaign.title : '',
            subtitle: typeof campaign?.subtitle === 'string' ? campaign.subtitle : '',
            body: typeof campaign?.body === 'string' ? campaign.body : '',
            ctaLabel: typeof campaign?.ctaLabel === 'string' ? campaign.ctaLabel : 'Explore campaign',
            ctaHref: safeHref(campaign?.ctaHref, '/products'),
            image: typeof campaign?.image === 'string' ? campaign.image : undefined,
            themeFrom: typeof campaign?.themeFrom === 'string' ? campaign.themeFrom : undefined,
            themeVia: typeof campaign?.themeVia === 'string' ? campaign.themeVia : undefined,
            themeTo: typeof campaign?.themeTo === 'string' ? campaign.themeTo : undefined,
            featuredCategory: typeof campaign?.featuredCategory === 'string' ? campaign.featuredCategory : undefined,
            placementPages: Array.isArray(campaign?.placementPages)
              ? campaign.placementPages.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
              : [],
            placementQuery: typeof campaign?.placementQuery === 'string' ? campaign.placementQuery : undefined,
            priority: typeof campaign?.priority === 'number' ? campaign.priority : 0,
          }))
          .filter((campaign) => campaign.slug.trim() && campaign.title.trim())
      : defaultStorefrontConfig.campaigns

    const templates = {
      announcementText:
        typeof parsed.templates?.announcementText === 'string'
          ? parsed.templates.announcementText
          : defaultStorefrontConfig.templates.announcementText,
      announcementHref: safeHref(parsed.templates?.announcementHref, defaultStorefrontConfig.templates.announcementHref),
      catalogHeroTitle:
        typeof parsed.templates?.catalogHeroTitle === 'string'
          ? parsed.templates.catalogHeroTitle
          : defaultStorefrontConfig.templates.catalogHeroTitle,
      catalogHeroSubtitle:
        typeof parsed.templates?.catalogHeroSubtitle === 'string'
          ? parsed.templates.catalogHeroSubtitle
          : defaultStorefrontConfig.templates.catalogHeroSubtitle,
      categoryHeroTitle:
        typeof parsed.templates?.categoryHeroTitle === 'string'
          ? parsed.templates.categoryHeroTitle
          : defaultStorefrontConfig.templates.categoryHeroTitle,
      categoryHeroSubtitle:
        typeof parsed.templates?.categoryHeroSubtitle === 'string'
          ? parsed.templates.categoryHeroSubtitle
          : defaultStorefrontConfig.templates.categoryHeroSubtitle,
      storesHeroTitle:
        typeof parsed.templates?.storesHeroTitle === 'string'
          ? parsed.templates.storesHeroTitle
          : defaultStorefrontConfig.templates.storesHeroTitle,
      storesHeroSubtitle:
        typeof parsed.templates?.storesHeroSubtitle === 'string'
          ? parsed.templates.storesHeroSubtitle
          : defaultStorefrontConfig.templates.storesHeroSubtitle,
      storeHeroTitle:
        typeof parsed.templates?.storeHeroTitle === 'string'
          ? parsed.templates.storeHeroTitle
          : defaultStorefrontConfig.templates.storeHeroTitle,
      storeHeroSubtitle:
        typeof parsed.templates?.storeHeroSubtitle === 'string'
          ? parsed.templates.storeHeroSubtitle
          : defaultStorefrontConfig.templates.storeHeroSubtitle,
      blogHeroTitle:
        typeof parsed.templates?.blogHeroTitle === 'string'
          ? parsed.templates.blogHeroTitle
          : defaultStorefrontConfig.templates.blogHeroTitle,
      blogHeroSubtitle:
        typeof parsed.templates?.blogHeroSubtitle === 'string'
          ? parsed.templates.blogHeroSubtitle
          : defaultStorefrontConfig.templates.blogHeroSubtitle,
      productHeroTitle:
        typeof parsed.templates?.productHeroTitle === 'string'
          ? parsed.templates.productHeroTitle
          : defaultStorefrontConfig.templates.productHeroTitle,
      productHeroSubtitle:
        typeof parsed.templates?.productHeroSubtitle === 'string'
          ? parsed.templates.productHeroSubtitle
          : defaultStorefrontConfig.templates.productHeroSubtitle,
    }

    return {
      headerMenu: headerMenu.length ? headerMenu : defaultStorefrontConfig.headerMenu,
      footerColumns: footerColumns.length ? footerColumns : defaultStorefrontConfig.footerColumns,
      bannerCards: bannerCards.length ? bannerCards : defaultStorefrontConfig.bannerCards,
      discoveryRoutes: discoveryRoutes.length ? discoveryRoutes : defaultStorefrontConfig.discoveryRoutes,
      searchPromotions: searchPromotions.length ? searchPromotions : defaultStorefrontConfig.searchPromotions,
      intentPresets: intentPresets.length ? intentPresets : defaultStorefrontConfig.intentPresets,
      campaigns: campaigns.length ? campaigns : defaultStorefrontConfig.campaigns,
      templates,
    }
  } catch {
    return defaultStorefrontConfig
  }
}

export function serializeStorefrontConfig(config: StorefrontConfig) {
  return JSON.stringify(config)
}

export function getMatchingSearchPromotions(search: string | undefined, promotions: StorefrontSearchPromotion[]) {
  const normalizedSearch = search?.trim().toLowerCase()
  if (!normalizedSearch) return []

  const tokens = normalizedSearch.split(/\s+/).filter(Boolean)

  return promotions
    .map((promotion) => {
      const normalizedQuery = promotion.query.trim().toLowerCase()
      if (!normalizedQuery) return null

      let score = 0
      if (normalizedSearch === normalizedQuery) score += 4
      if (normalizedSearch.startsWith(normalizedQuery)) score += 3
      if (tokens.includes(normalizedQuery)) score += 2
      if (normalizedSearch.includes(normalizedQuery)) score += 1
      if (score === 0) return null

      return { ...promotion, score }
    })
    .filter((promotion): promotion is StorefrontSearchPromotion & { score: number } => Boolean(promotion))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
}

type BannerPlacementContext = {
  page: 'home' | 'search' | 'store' | 'account' | 'product' | 'cart' | 'checkout' | 'order-success'
  search?: string
  category?: string
}

export function getMatchingBannerCards(
  banners: StorefrontBannerCard[],
  context: BannerPlacementContext,
) {
  const normalizedSearch = context.search?.trim().toLowerCase()
  const normalizedCategory = context.category?.trim().toLowerCase()
  const now = Date.now()

  return banners
    .map((banner) => {
      if (banner.isActive === false) {
        return null
      }

      if (banner.startsAt && Number.isFinite(new Date(banner.startsAt).getTime()) && new Date(banner.startsAt).getTime() > now) {
        return null
      }

      if (banner.endsAt && Number.isFinite(new Date(banner.endsAt).getTime()) && new Date(banner.endsAt).getTime() < now) {
        return null
      }

      let score = 0
      const pages = (banner.placementPages ?? []).map((page) => page.trim().toLowerCase()).filter(Boolean)
      if (pages.length === 0 || pages.includes(context.page)) {
        score += pages.includes(context.page) ? 3 : 1
      } else {
        return null
      }

      const featuredCategory = banner.featuredCategory?.trim().toLowerCase()
      if (featuredCategory) {
        if (featuredCategory === normalizedCategory) {
          score += 3
        } else if (context.category) {
          return null
        }
      }

      const placementQuery = banner.placementQuery?.trim().toLowerCase()
      if (placementQuery) {
        if (!normalizedSearch) return null
        if (normalizedSearch === placementQuery) score += 4
        else if (normalizedSearch.startsWith(placementQuery)) score += 3
        else if (normalizedSearch.includes(placementQuery)) score += 2
        else return null
      }

      score += typeof banner.priority === 'number' ? banner.priority : 0
      return { ...banner, score }
    })
    .filter((banner): banner is StorefrontBannerCard & { score: number } => Boolean(banner))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
}

type CampaignPlacementContext = {
  page: 'home' | 'search' | 'store' | 'account' | 'product' | 'cart' | 'checkout' | 'order-success'
  search?: string
  category?: string
}

export function getMatchingCampaigns(
  campaigns: StorefrontCampaign[],
  context: CampaignPlacementContext,
) {
  const normalizedSearch = context.search?.trim().toLowerCase()
  const normalizedCategory = context.category?.trim().toLowerCase()

  return campaigns
    .map((campaign) => {
      let score = 0

      const pages = (campaign.placementPages ?? []).map((page) => page.trim().toLowerCase()).filter(Boolean)
      if (pages.length === 0 || pages.includes(context.page)) {
        score += pages.includes(context.page) ? 3 : 1
      } else {
        return null
      }

      const featuredCategory = campaign.featuredCategory?.trim().toLowerCase()
      if (featuredCategory) {
        if (featuredCategory === normalizedCategory) {
          score += 3
        } else if (context.category) {
          return null
        }
      }

      const placementQuery = campaign.placementQuery?.trim().toLowerCase()
      if (placementQuery) {
        if (!normalizedSearch) return null
        if (normalizedSearch === placementQuery) score += 4
        else if (normalizedSearch.startsWith(placementQuery)) score += 3
        else if (normalizedSearch.includes(placementQuery)) score += 2
        else return null
      }

      score += typeof campaign.priority === 'number' ? campaign.priority : 0
      return { ...campaign, score }
    })
    .filter((campaign): campaign is StorefrontCampaign & { score: number } => Boolean(campaign))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
}

export function getMatchingIntentPresets(
  presets: StorefrontIntentPreset[],
  page: 'search' | 'cart' | 'checkout' | 'account' | 'order-success',
) {
  return presets.filter((preset) => {
    const pages = (preset.pages ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean)
    return pages.length === 0 || pages.includes(page)
  })
}
