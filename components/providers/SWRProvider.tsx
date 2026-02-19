'use client'

// components/providers/SWRProvider.tsx
// Globalny provider SWR dla całej aplikacji.
// Musi owijać wszystkie Client Components które używają useSWR().

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * Globalny provider SWR dla całej aplikacji.
 * Konfiguracja: brak globalnego fetchera — każdy hook definiuje własny.
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Nie retry automatycznie — fetchBridge już robi retry 1x
        shouldRetryOnError: false,
        // Nie rewaliduj przy focusie — dashboard nie potrzebuje
        revalidateOnFocus: false,
        // Nie rewaliduj przy reconnect — polling wystarczy
        revalidateOnReconnect: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}
