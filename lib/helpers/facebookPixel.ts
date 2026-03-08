export type FacebookPixelEventPayload = {
  event: string
  payload?: Record<string, unknown>
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[][]
      loaded?: boolean
      version?: string
    }
    _fbq?: (...args: unknown[]) => void
  }
}

export function dispatchFacebookPixelEvent(event: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<FacebookPixelEventPayload>('buyzilo:facebook-pixel', {
      detail: { event, payload },
    })
  )
}
