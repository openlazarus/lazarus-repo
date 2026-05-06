'use client'

import { LazyMotion } from 'motion/react'
import { SWRConfig } from 'swr'

import { AuthInitializer } from '@/components/auth/auth-initializer'
import { FocusProvider } from '@/hooks/ui/interaction/use-focus'
import { swrConfig } from '@/lib/swr-config'
import { IdentityProvider } from '@/state/identity'
import { IOProvider } from '@/state/io/io-context-provider'
import { StoreProvider } from '@/state/store'
import { UIStateProvider } from '@/state/ui-state'

// Lazy load motion features once for the entire app
const loadFeatures = () =>
  import('@/components/ui/motion-features').then((res) => res.default)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthInitializer>
      <SWRConfig value={swrConfig}>
        <IdentityProvider>
          <StoreProvider>
            <UIStateProvider>
              <IOProvider>
                <FocusProvider>
                  <LazyMotion features={loadFeatures} strict>
                    {children}
                  </LazyMotion>
                </FocusProvider>
              </IOProvider>
            </UIStateProvider>
          </StoreProvider>
        </IdentityProvider>
      </SWRConfig>
    </AuthInitializer>
  )
}
