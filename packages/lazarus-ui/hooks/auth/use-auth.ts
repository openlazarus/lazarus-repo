/**
 * useAuth — compatibility shim that delegates to Zustand auth-store.
 *
 * 32+ files import this hook. The external API is unchanged:
 * session, profile, isInitialized, isAuthenticated, authState fields,
 * requestOTP, verifyOTP, signOut, signInWithOAuth, getSession,
 * fetchProfile, refetchProfile.
 *
 * Internally all state now lives in the auth-store singleton,
 * eliminating duplicate profile queries and session fetches.
 *
 * @deprecated Prefer importing from `@/store/auth-store` directly for new code.
 */

import { useAuthStore } from '@/store/auth-store'

export function useAuth() {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const authState = useAuthStore((s) => s.authState)
  const requestOTP = useAuthStore((s) => s.requestOTP)
  const verifyOTP = useAuthStore((s) => s.verifyOTP)
  const requestPhoneOTP = useAuthStore((s) => s.requestPhoneOTP)
  const verifyPhoneOTP = useAuthStore((s) => s.verifyPhoneOTP)
  const signOut = useAuthStore((s) => s.signOut)
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth)
  const getSession = useAuthStore((s) => s.getSession)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const refetchProfile = useAuthStore((s) => s.refetchProfile)

  return {
    ...authState,
    session,
    profile,
    isInitialized,
    isAuthenticated: !!session,
    requestOTP,
    verifyOTP,
    requestPhoneOTP,
    verifyPhoneOTP,
    signOut,
    signInWithOAuth,
    getSession,
    fetchProfile,
    refetchProfile,
  }
}
