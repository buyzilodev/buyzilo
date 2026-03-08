export type FacebookPixelConfig = {
  enabled: boolean
  pixelId: string
  trackPageViews: boolean
}

export type GoogleAnalyticsConfig = {
  enabled: boolean
  measurementId: string
  trackPageViews: boolean
}

export function parseFacebookPixelConfig(raw: string | null | undefined): FacebookPixelConfig {
  if (!raw) {
    return {
      enabled: false,
      pixelId: '',
      trackPageViews: true,
    }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FacebookPixelConfig>
    return {
      enabled: parsed.enabled === true && typeof parsed.pixelId === 'string' && parsed.pixelId.trim().length > 0,
      pixelId: parsed.pixelId?.trim() ?? '',
      trackPageViews: parsed.trackPageViews !== false,
    }
  } catch {
    return {
      enabled: false,
      pixelId: '',
      trackPageViews: true,
    }
  }
}

export function parseGoogleAnalyticsConfig(raw: string | null | undefined): GoogleAnalyticsConfig {
  if (!raw) {
    return {
      enabled: false,
      measurementId: '',
      trackPageViews: true,
    }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GoogleAnalyticsConfig>
    return {
      enabled:
        parsed.enabled === true &&
        typeof parsed.measurementId === 'string' &&
        parsed.measurementId.trim().length > 0,
      measurementId: parsed.measurementId?.trim() ?? '',
      trackPageViews: parsed.trackPageViews !== false,
    }
  } catch {
    return {
      enabled: false,
      measurementId: '',
      trackPageViews: true,
    }
  }
}
