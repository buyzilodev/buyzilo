export type GoogleAnalyticsEventPayload = {
  event: string
  payload?: Record<string, unknown>
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function dispatchGoogleAnalyticsEvent(event: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<GoogleAnalyticsEventPayload>('buyzilo:google-analytics', {
      detail: { event, payload },
    })
  )
}
