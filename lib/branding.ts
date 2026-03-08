export type PublicBrandingSettings = {
  siteName: string
  tagline: string
  logoText: string
  logoUrl: string
  faviconUrl: string
  supportPhone: string
  supportEmail: string
  primaryColor: string
  secondaryColor: string
  footerText: string
  sellerCtaLabel: string
}

export const defaultBranding: PublicBrandingSettings = {
  siteName: 'Buyzilo',
  tagline: 'Shop Everything You Love',
  logoText: 'B',
  logoUrl: '',
  faviconUrl: '',
  supportPhone: '+1 (800) BUYZILO',
  supportEmail: 'support@buyzilo.com',
  primaryColor: '#2563eb',
  secondaryColor: '#0f172a',
  footerText: 'All rights reserved.',
  sellerCtaLabel: 'Sell on Buyzilo',
}

export function brandingFromSettingsMap(settings: Record<string, string>): PublicBrandingSettings {
  return {
    siteName: settings.siteName || defaultBranding.siteName,
    tagline: settings.tagline || defaultBranding.tagline,
    logoText: settings.logoText || defaultBranding.logoText,
    logoUrl: settings.logoUrl || defaultBranding.logoUrl,
    faviconUrl: settings.faviconUrl || defaultBranding.faviconUrl,
    supportPhone: settings.sitePhone || settings.supportPhone || defaultBranding.supportPhone,
    supportEmail: settings.siteEmail || settings.supportEmail || defaultBranding.supportEmail,
    primaryColor: settings.primaryColor || defaultBranding.primaryColor,
    secondaryColor: settings.secondaryColor || defaultBranding.secondaryColor,
    footerText: settings.footerText || defaultBranding.footerText,
    sellerCtaLabel: settings.sellerCtaLabel || defaultBranding.sellerCtaLabel,
  }
}
