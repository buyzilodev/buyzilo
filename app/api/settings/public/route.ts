import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { brandingFromSettingsMap } from '@/lib/branding'
import { buildEffectiveCategorySchemaMap, getCategoryProductSchemaConfig } from '@/lib/actions/categoryProductSchema'
import { parseHomepageConfig } from '@/lib/helpers/homepageConfig'
import { parseFacebookPixelConfig, parseGoogleAnalyticsConfig } from '@/lib/helpers/marketing'
import { parseBanners, parseNavigationLinks } from '@/lib/helpers/navigation'
import { parseRecaptchaConfig, toPublicRecaptchaConfig } from '@/lib/helpers/recaptcha'
import { parseShippingMethods } from '@/lib/helpers/shipping'
import { parseStorefrontConfig } from '@/lib/helpers/storefrontConfig'

function parseJsonArray<T>(value: string | undefined, fallback: T[]): T[] {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value) as T[]
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export async function GET() {
  try {
    const [rows, categories, categorySchemaConfig] = await Promise.all([
      prisma.siteSettings.findMany(),
      prisma.category.findMany({ select: { id: true, parentId: true } }),
      getCategoryProductSchemaConfig(),
    ])
    const map: Record<string, string> = {}
    rows.forEach((row) => {
      map[row.key] = row.value
    })
    const effectiveCategorySchemaMap = buildEffectiveCategorySchemaMap(categories, categorySchemaConfig)

    return NextResponse.json({
      ...brandingFromSettingsMap(map),
      headerNavigation: parseNavigationLinks(map.headerNavigationConfig, [
        { title: 'Products', href: '/products' },
        { title: 'Stores', href: '/stores' },
        { title: 'Blog', href: '/blog' },
      ]),
      homepageConfig: parseHomepageConfig(map.homepageConfig),
      storefrontConfig: parseStorefrontConfig(map.storefrontConfig),
      footerNavigation: parseNavigationLinks(map.footerNavigationConfig, [
        { title: 'Privacy Policy', href: '/pages/privacy-policy' },
        { title: 'Terms of Service', href: '/pages/terms-of-service' },
      ]),
      banners: parseBanners(map.bannerConfig, []),
      shippingMethods: parseShippingMethods(map.shippingMethodsConfig),
      facebookPixel: parseFacebookPixelConfig(map.facebookPixelConfig),
      googleAnalytics: parseGoogleAnalyticsConfig(map.googleAnalyticsConfig),
      recaptcha: toPublicRecaptchaConfig(parseRecaptchaConfig(map.recaptchaConfig)),
      productFeaturesSchema: parseJsonArray(map.productFeaturesSchema, []),
      catalogFilterSchema: parseJsonArray(map.catalogFilterSchema, []),
      categoryProductSchema: Object.fromEntries(
        Array.from(effectiveCategorySchemaMap.entries()).map(([categoryId, rule]) => [
          categoryId,
          { featureKeys: rule.featureKeys, filterKeys: rule.filterKeys },
        ])
      ),
      seoDefaultTitle: map.seoDefaultTitle ?? '',
      seoDefaultDescription: map.seoDefaultDescription ?? '',
    })
  } catch {
    return NextResponse.json({
      ...brandingFromSettingsMap({}),
      headerNavigation: [
        { title: 'Products', href: '/products' },
        { title: 'Stores', href: '/stores' },
        { title: 'Blog', href: '/blog' },
      ],
      homepageConfig: parseHomepageConfig(null),
      storefrontConfig: parseStorefrontConfig(null),
      footerNavigation: [
        { title: 'Privacy Policy', href: '/pages/privacy-policy' },
        { title: 'Terms of Service', href: '/pages/terms-of-service' },
      ],
      banners: [],
      shippingMethods: parseShippingMethods(null),
      facebookPixel: parseFacebookPixelConfig(null),
      googleAnalytics: parseGoogleAnalyticsConfig(null),
      recaptcha: toPublicRecaptchaConfig(parseRecaptchaConfig(null)),
      productFeaturesSchema: [],
      catalogFilterSchema: [],
      categoryProductSchema: {},
      seoDefaultTitle: '',
      seoDefaultDescription: '',
    })
  }
}
