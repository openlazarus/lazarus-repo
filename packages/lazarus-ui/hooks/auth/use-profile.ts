/**
 * useProfile — compatibility shim that delegates to Zustand auth-store.
 *
 * 3 files import this hook. The external API is unchanged.
 *
 * @deprecated Prefer importing from `@/store/auth-store` directly for new code.
 */

import { useAuthStore } from '@/store/auth-store'

export function useProfile() {
  const profile = useAuthStore((s) => s.profile)
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const refetchProfile = useAuthStore((s) => s.refetchProfile)

  return {
    profile,
    loading: isProfileLoading,
    isUpdating: false,
    error: null as Error | null,
    updateProfile,
    refreshProfile: refetchProfile,
    subscription: profile?.plan,
  }
}
