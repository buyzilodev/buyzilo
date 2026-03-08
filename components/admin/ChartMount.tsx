'use client'

import { useSyncExternalStore } from 'react'

export function useChartMount() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
