'use client'

import { useEffect, useRef } from 'react'

import { useAuthStore } from '@/store/auth-store'

/**
 * Thin component that calls authStore.initialize() once on mount.
 * Replaces IdentityProvider as the mount point for auth state.
 * No context provider needed — state lives in Zustand.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const unsubscribe = useAuthStore.getState().initialize()
    return () => unsubscribe()
  }, [])

  return <>{children}</>
}
