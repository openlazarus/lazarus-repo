'use client'

import { useMemo } from 'react'
import { useAuth } from './auth/use-auth'
import { getWorkspaceBaseUrl } from './data/use-workspace-api'
import { MessageHandler, useWebSocket } from './sockets/use-websocket'

/**
 * Unified workspace socket hook that handles both file watching and agent status
 * via a single WebSocket connection to /ws/workspace endpoint
 *
 * This replaces the need for separate /ws/files and /ws/agents connections
 */

export interface UseWorkspaceSocketProps {
  workspaceId?: string
  messageHandlers: Record<string, MessageHandler>
  onStatusChange?: (status: string) => void
  onError?: (error: string) => void
  autoConnect?: boolean
}

export function useWorkspaceSocket({
  workspaceId,
  messageHandlers,
  onStatusChange,
  onError,
  autoConnect = true,
}: UseWorkspaceSocketProps) {
  const { profile } = useAuth()
  const userId = profile?.id

  // Build unified WebSocket URL for /ws/workspace endpoint
  const wsUrl = useMemo(() => {
    if (!userId) return ''

    const apiUrl = getWorkspaceBaseUrl(workspaceId)
    const baseWsUrl = apiUrl.replace(/^http/, 'ws')

    // Include workspace if provided, otherwise just userId
    if (workspaceId) {
      return `${baseWsUrl}/ws/workspace?workspace=${workspaceId}&userId=${userId}`
    } else {
      return `${baseWsUrl}/ws/workspace?userId=${userId}`
    }
  }, [userId, workspaceId])

  // Connect to unified workspace socket via WebSocketManager
  const { status, error, connect, disconnect, sendMessage, webSocket } =
    useWebSocket({
      url: wsUrl,
      messageHandlers,
      autoConnect: autoConnect && !!userId,
      onStatusChange,
      onError,
    })

  return {
    status,
    error,
    isConnected: status === 'connected',
    connect,
    disconnect,
    sendMessage,
    webSocket,
  }
}
