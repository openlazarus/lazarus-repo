import { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

import { clearCachedToken } from '@/lib/api-client'
import { createUserProfile, UserProfile } from '@/model/user-profile'
import { createClient } from '@/utils/supabase/client'

// Singleton supabase client for the store
let supabaseClient: ReturnType<typeof createClient> | null = null
const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

// Read stored session from localStorage (safe for SSR)
function getStoredSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('lazarus:session')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

interface AuthState {
  isLoading: boolean
  error: string | null
  success: boolean
}

interface AuthStore {
  // State
  session: Session | null
  userId: string | null
  profile: UserProfile | null
  isInitialized: boolean
  isProfileLoading: boolean
  authState: AuthState

  // Auth actions
  initialize: () => () => void // returns unsubscribe fn
  requestOTP: (email: string) => Promise<void>
  verifyOTP: (email: string, token: string) => Promise<boolean>
  requestPhoneOTP: (phone: string) => Promise<void>
  verifyPhoneOTP: (phone: string, token: string) => Promise<boolean>
  signInWithOAuth: (
    provider: 'google' | 'apple' | 'discord' | 'linkedin_oidc',
    afterAuthRedirect?: string,
  ) => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<Session | null>

  // Profile actions
  fetchProfile: (userId: string) => Promise<UserProfile | null>
  refetchProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile | null>

  // Internal
  _profileFetchPromise: Promise<UserProfile | null> | null
  _currentSessionUserId: string | null // track to avoid re-renders on token refresh
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  // Initial state — hydrate from localStorage immediately
  session: getStoredSession(),
  userId: getStoredSession()?.user?.id ?? null,
  profile: null,
  isInitialized: !!getStoredSession(),
  isProfileLoading: false,
  authState: {
    isLoading: !getStoredSession(),
    error: null,
    success: false,
  },
  _profileFetchPromise: null,
  _currentSessionUserId: getStoredSession()?.user?.id ?? null,

  /**
   * Initialize auth — sets up onAuthStateChange listener + loads stored session.
   * Returns unsubscribe function. Should be called once from <AuthInitializer>.
   */
  initialize: () => {
    const supabase = getSupabase()

    const updateAuthState = (
      newSession: Session | null,
      forceUpdate = false,
    ) => {
      const state = get()
      const currentUserId = state._currentSessionUserId

      // Only trigger re-renders on actual identity changes (different user or login/logout)
      const sessionChanged =
        forceUpdate ||
        currentUserId !== (newSession?.user?.id ?? null) ||
        (state.session === null) !== (newSession === null)

      if (!sessionChanged) {
        // Token refresh — update localStorage and session state (keeps useAuthHeaders fresh)
        if (newSession) {
          localStorage.setItem('lazarus:session', JSON.stringify(newSession))
          set({ session: newSession })
        }
        return
      }

      // Persist session
      if (newSession) {
        localStorage.setItem('lazarus:session', JSON.stringify(newSession))
      } else {
        localStorage.removeItem('lazarus:session')
      }

      const newUserId = newSession?.user?.id ?? null

      set({
        session: newSession,
        userId: newUserId,
        isInitialized: true,
        _currentSessionUserId: newUserId,
        authState: { isLoading: false, error: null, success: false },
      })

      // Auto-fetch profile when user signs in
      if (newUserId) {
        get().fetchProfile(newUserId)
      } else {
        set({ profile: null })
      }
    }

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      updateAuthState(newSession)

      // Profile sync on email/phone change is handled by the confirm API
      // route via service role. We intentionally do NOT refetch here —
      // doing so during updateUser() causes re-renders that reset the
      // contact verification form state (loading spinner, success message).
      // The confirm page updates the store directly after verification.
    })

    // Check for initial stored session
    const initialSession = getStoredSession()
    if (initialSession) {
      updateAuthState(initialSession, true)

      // Hydrate the Supabase client with stored tokens
      supabase.auth
        .setSession({
          access_token: initialSession.access_token,
          refresh_token: initialSession.refresh_token,
        })
        .then(({ data: { session: hydratedSession } }) => {
          if (hydratedSession) {
            updateAuthState(hydratedSession)
          }
        })
    } else {
      // No stored session — check Supabase directly
      supabase.auth
        .getSession()
        .then(({ data: { session: fetchedSession } }) => {
          updateAuthState(fetchedSession, true)
        })
    }

    // Return unsubscribe function
    return () => subscription?.unsubscribe()
  },

  /**
   * Fetch profile from Supabase. Deduped via promise guard.
   */
  fetchProfile: async (userId: string) => {
    const state = get()

    // Return existing promise if a fetch is already in-flight
    if (state._profileFetchPromise) {
      return state._profileFetchPromise
    }

    const promise = (async (): Promise<UserProfile | null> => {
      set({ isProfileLoading: true })

      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('[AuthStore] Profile fetch error:', error)
          set({ isProfileLoading: false })
          return null
        }

        if (!data) {
          set({ isProfileLoading: false })
          return null
        }

        const profile = createUserProfile({
          id: data.id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          avatar: data.avatar,
          birthdate: data.birthdate,
          last_sign_in_at: data.last_sign_in_at,
          stripe_customer_id: data.stripe_customer_id,
          plan: data.plan,
          storage_bucket_name: data.storage_bucket_name,
          storage_quota_mb: data.storage_quota_mb,
          storage_used_mb: data.storage_used_mb,
          monthly_chat_limit: data.monthly_chat_limit,
          monthly_chats_used: data.monthly_chats_used,
          connected_apps_limit: data.connected_apps_limit,
          connected_apps_count: data.connected_apps_count,
          upload_email: data.upload_email,
          phone_number: data.phone_number,
          email_verified: data.email_verified,
          still_on_waitlist: data.still_on_waitlist,
        })

        set({ profile, isProfileLoading: false })
        return profile
      } catch (err) {
        console.error('[AuthStore] Profile fetch failed:', err)
        set({ isProfileLoading: false })
        return null
      }
    })()

    set({ _profileFetchPromise: promise })

    try {
      return await promise
    } finally {
      set({ _profileFetchPromise: null })
    }
  },

  refetchProfile: async () => {
    const state = get()
    if (state.userId) {
      // Force a fresh fetch by clearing the dedup guard first
      set({ _profileFetchPromise: null })
      await get().fetchProfile(state.userId)
    }
  },

  updateProfile: async (updates) => {
    const state = get()
    if (!state.userId) return null

    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.userId)

      if (error) throw error

      // Refetch to get latest data
      await get().refetchProfile()
      return get().profile
    } catch (err) {
      console.error('[AuthStore] Profile update failed:', err)
      return null
    }
  },

  requestOTP: async (email: string) => {
    try {
      set({
        authState: { isLoading: true, error: null, success: false },
      })

      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })

      if (error) throw error

      set({
        authState: { isLoading: false, error: null, success: true },
      })
    } catch (error) {
      set({
        authState: {
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to send verification code',
          success: false,
        },
      })
    }
  },

  verifyOTP: async (email: string, token: string) => {
    try {
      set({
        authState: { isLoading: true, error: null, success: false },
      })

      const supabase = getSupabase()
      const { error, data } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      if (error) throw error

      // Persist session immediately
      if (data.session) {
        localStorage.setItem('lazarus:session', JSON.stringify(data.session))
        set({
          session: data.session,
          userId: data.user?.id ?? null,
          _currentSessionUserId: data.user?.id ?? null,
        })
      }

      if (data.user) {
        get().fetchProfile(data.user.id)
      }

      set({
        authState: { isLoading: false, error: null, success: true },
      })

      return true
    } catch (error) {
      set({
        authState: {
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Invalid verification code',
          success: false,
        },
      })
      return false
    }
  },

  requestPhoneOTP: async (phone: string) => {
    try {
      set({
        authState: { isLoading: true, error: null, success: false },
      })

      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { shouldCreateUser: true },
      })

      if (error) throw error

      set({
        authState: { isLoading: false, error: null, success: true },
      })
    } catch (error) {
      set({
        authState: {
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to send SMS code',
          success: false,
        },
      })
    }
  },

  verifyPhoneOTP: async (phone: string, token: string) => {
    try {
      set({
        authState: { isLoading: true, error: null, success: false },
      })

      const supabase = getSupabase()
      const { error, data } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      })

      if (error) throw error

      // Persist session immediately
      if (data.session) {
        localStorage.setItem('lazarus:session', JSON.stringify(data.session))
        set({
          session: data.session,
          userId: data.user?.id ?? null,
          _currentSessionUserId: data.user?.id ?? null,
        })
      }

      if (data.user) {
        get().fetchProfile(data.user.id)
      }

      set({
        authState: { isLoading: false, error: null, success: true },
      })

      return true
    } catch (error) {
      set({
        authState: {
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Invalid verification code',
          success: false,
        },
      })
      return false
    }
  },

  signInWithOAuth: async (provider, afterAuthRedirect?) => {
    try {
      set({
        authState: { isLoading: true, error: null, success: false },
      })

      let callbackUrl = `${window.location.origin}/api/auth/callback`
      if (afterAuthRedirect) {
        callbackUrl += `?redirect=${encodeURIComponent(afterAuthRedirect)}`
      }

      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (error) {
      set({
        authState: {
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : `Failed to sign in with ${provider}`,
          success: false,
        },
      })
    }
  },

  signOut: async () => {
    try {
      set({
        authState: { isLoading: true, error: null, success: false },
      })

      const supabase = getSupabase()
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      // Clear all state
      set({
        session: null,
        userId: null,
        profile: null,
        isInitialized: true,
        _currentSessionUserId: null,
        authState: { isLoading: false, error: null, success: false },
      })

      // Clear cached API token
      clearCachedToken()

      // Clear localStorage
      localStorage.removeItem('lazarus:session')
      sessionStorage.clear()
      Object.keys(localStorage).forEach((key) => {
        if (
          key.includes('lazarus') ||
          key.includes('supabase') ||
          key.startsWith('swr-')
        ) {
          localStorage.removeItem(key)
        }
      })

      // Redirect
      window.location.href = '/'
    } catch (error) {
      set({
        authState: {
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to sign out',
          success: false,
        },
      })

      // Emergency cleanup
      try {
        clearCachedToken()
        localStorage.removeItem('lazarus:session')
        sessionStorage.clear()
      } catch {
        // ignore
      }

      window.location.href = '/'
    }
  },

  getSession: async () => {
    const state = get()
    if (state.session) return state.session

    const supabase = getSupabase()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      set({ session })
    }

    return session
  },
}))
