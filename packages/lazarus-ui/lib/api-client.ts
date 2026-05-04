/**
 * Centralized API Client with JWT Authentication
 *
 * This client automatically adds Supabase JWT tokens to all API requests
 * and handles authentication errors by redirecting to login.
 *
 * Token caching: The access token is cached in a module-level variable
 * and only refreshed when missing or within 60s of expiry.
 */

import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'

import { useWorkspaceStore } from '@/store/workspace-store'
import { createClient } from '@/utils/supabase/client'

// --- Token cache ---
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Clear the cached token. Call this on sign-out so the next request
 * fetches a fresh session instead of reusing a stale token.
 */
export function clearCachedToken() {
  cachedToken = null
}

/**
 * Get a valid access token, using the cache when possible.
 * Only calls getSession() if the cached token is missing or expires within 60s.
 */
async function getAccessToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)

  // Use cached token if it has more than 60s remaining
  if (cachedToken && cachedToken.expiresAt - now > 60) {
    return cachedToken.token
  }

  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('[API Client] Error getting session:', error)
    return null
  }

  if (session?.access_token) {
    cachedToken = {
      token: session.access_token,
      expiresAt: session.expires_at ?? now + 3600,
    }
    return session.access_token
  }

  cachedToken = null
  return null
}

// Get workspace ID directly from the Zustand store (no circular import
// since workspace-store.ts no longer imports from api-client.ts).
export function getWorkspaceIdFromContext(): string | null {
  return useWorkspaceStore.getState().activeWorkspaceId
}

// Get team ID from context (session storage)
export function getTeamIdFromContext(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('currentTeamId')
}

// Create axios instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LAZARUS_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minute timeout (supports large file uploads)
})

// Request interceptor - Add JWT token to all requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get access token (cached or fresh)
      const token = await getAccessToken()

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        console.warn('[API Client] No session token available')
      }

      // Add workspace context if available
      const workspaceId = getWorkspaceIdFromContext()
      if (workspaceId) {
        config.headers['x-workspace-id'] = workspaceId
      }

      // Add team context if available
      const teamId = getTeamIdFromContext()
      if (teamId) {
        config.headers['x-team-id'] = teamId
      }

      // For FormData uploads, remove Content-Type header so browser sets it with boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type']
      }
    } catch (error) {
      console.error('[API Client] Error in request interceptor:', error)
    }

    return config
  },
  (error) => {
    console.error('[API Client] Request error:', error)
    return Promise.reject(error)
  },
)

// Response interceptor - Handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    // Return successful responses as-is
    return response
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('[API Client] 401 Unauthorized - Redirecting to signin')

      // Clear cached token so next request gets a fresh one
      clearCachedToken()

      // Token expired or invalid - sign out and redirect
      const supabase = createClient()
      await supabase.auth.signOut()

      // Only redirect if we're in the browser
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search
        window.location.href = `/signin?redirect=${encodeURIComponent(currentPath)}`
      }
    } else if (error.response?.status === 403) {
      console.warn('[API Client] 403 Forbidden - Access denied')
      // Don't redirect on 403, let the UI handle it
    } else if (error.response?.status === 500) {
      console.error('[API Client] 500 Server Error:', error.response.data)
    }

    return Promise.reject(error)
  },
)

/**
 * Helper function to make API requests with proper typing
 */
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      method,
      url: endpoint,
      data,
      ...config,
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'API request failed',
      )
    }
    throw error
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string, config?: AxiosRequestConfig) =>
    apiRequest<T>('GET', endpoint, undefined, config),

  post: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>('POST', endpoint, data, config),

  put: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>('PUT', endpoint, data, config),

  patch: <T>(endpoint: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>('PATCH', endpoint, data, config),

  delete: <T>(endpoint: string, config?: AxiosRequestConfig) =>
    apiRequest<T>('DELETE', endpoint, undefined, config),
}

export default apiClient
