import { SWRConfiguration } from 'swr'

/**
 * Global SWR configuration defaults.
 *
 * These settings apply to all SWR hooks app-wide via the <SWRConfig> provider.
 * Consumers should never import SWR directly — use the auth-aware hooks instead.
 */
export const swrConfig: SWRConfiguration = {
  // Deduplicate identical requests within 5 seconds
  dedupingInterval: 5000,

  // Don't revalidate when window regains focus (reduces noise)
  revalidateOnFocus: false,

  // Revalidate when network reconnects (useful for mobile)
  revalidateOnReconnect: true,

  // Show stale data while revalidating
  keepPreviousData: true,

  // Retry failed requests up to 3 times
  errorRetryCount: 3,
}
