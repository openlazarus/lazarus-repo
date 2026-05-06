/**
 * Shared WebSocket utilities for workspace connections
 */

import { getWorkspaceIdFromContext } from './api-client'

/**
 * Returns the WSS base URL for the current workspace.
 * Mirrors getWorkspaceBaseUrl() from use-workspace-api.ts but with wss:// scheme.
 */
export function getWorkspaceWssUrl(): string {
  const override = process.env.NEXT_PUBLIC_WORKSPACE_API_URL
  if (override) {
    return override.replace(/^https/, 'wss').replace(/^http/, 'ws')
  }

  const baseDomain =
    process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN || 'localhost'
  const workspaceId = getWorkspaceIdFromContext()
  if (!workspaceId) return 'ws://localhost:8765'

  return `wss://${workspaceId}.${baseDomain}`
}

/**
 * Builds a WebSocket URL for the unified /ws/workspace endpoint on the
 * workspace-specific subdomain instance.
 */
export function buildWorkspaceSocketUrl(
  workspaceId?: string,
  userId?: string,
): string {
  const base = workspaceId
    ? (() => {
        const override = process.env.NEXT_PUBLIC_WORKSPACE_API_URL
        if (override)
          return override.replace(/^https/, 'wss').replace(/^http/, 'ws')
        const baseDomain =
          process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN || 'localhost'
        return `wss://${workspaceId}.${baseDomain}`
      })()
    : getWorkspaceWssUrl()

  const params = new URLSearchParams()
  if (workspaceId) params.append('workspace', workspaceId)
  if (userId) params.append('userId', userId)

  const queryString = params.toString()
  return queryString
    ? `${base}/ws/workspace?${queryString}`
    : `${base}/ws/workspace`
}

export function createConnectionEstablishedHandler(hookName: string) {
  return (_message: any) => {
    console.log(`[${hookName}] Connected to unified workspace socket`)
  }
}
