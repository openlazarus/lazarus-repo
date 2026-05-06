/**
 * Identity compatibility shim
 *
 * This module now reads from the Zustand auth-store, preferences-store,
 * and workspace-store instead of maintaining its own React Context.
 * All 16+ consumers of useIdentity() continue to work unchanged.
 *
 * The IdentityProvider is kept as a thin passthrough for backward
 * compatibility with the provider tree — it just renders children.
 */

import { ReactNode } from 'react'

import { UserPreferences, UserProfile } from '@/model/user-profile'
import { useAuthStore } from '@/store/auth-store'
import { usePreferencesStore } from '@/store/preferences-store'
import { useWorkspaceStore } from '@/store/workspace-store'

/**
 * Identity context value type (kept for type compatibility)
 */
export interface IdentityContextValue {
  profile: UserProfile | null
  updateProfile: (
    updates: Partial<UserProfile>,
  ) => Promise<UserProfile | null | undefined>
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
  isAuthenticated: boolean
  isProfileLoading: boolean
  isProfileUpdating: boolean
  profileError: Error | null
  isStorageSaving: boolean
  storageError: Error | null
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (workspaceId: string) => void
  /** @deprecated Use activeWorkspaceId instead */
  activeServerId: string | null
  /** @deprecated Use setActiveWorkspaceId instead */
  setActiveServerId: (serverId: string) => void
}

/**
 * useIdentity — compatibility shim that reads from Zustand stores.
 *
 * Components using this hook will only re-render when the specific
 * slices they consume change (thanks to Zustand selectors).
 */
export function useIdentity(): IdentityContextValue {
  const profile = useAuthStore((s) => s.profile)
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const session = useAuthStore((s) => s.session)

  const preferences = usePreferencesStore((s) => s.preferences)
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences)

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  return {
    profile,
    updateProfile,
    preferences,
    updatePreferences,
    isAuthenticated: !!session,
    isProfileLoading,
    isProfileUpdating: false,
    profileError: null,
    isStorageSaving: false,
    storageError: null,
    activeWorkspaceId,
    setActiveWorkspaceId: setActiveWorkspace,
    // Legacy support
    activeServerId: activeWorkspaceId,
    setActiveServerId: setActiveWorkspace,
  }
}

/**
 * IdentityProvider — kept as a thin passthrough.
 * AuthInitializer handles the actual auth initialization.
 */
export function IdentityProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// Keep default export for backward compatibility
const IdentityContext = null
export default IdentityContext
