import { useEffect, useMemo, useRef, useState } from 'react'

import { buildWorkspaceSocketUrl } from '@/lib/websocket-utils'

import { useAuth } from '../auth/use-auth'
import { useWebSocket } from '../sockets/use-websocket'

export interface FileChangeEvent {
  type:
    | 'file:created'
    | 'file:modified'
    | 'file:deleted'
    | 'connection:established'
  workspace: string
  path?: string
  timestamp: string
  userId?: string
}

interface UseFileWatcherOptions {
  workspaceId: string
  userId?: string // Now optional, will use auth context if not provided
  onFileChange?: (event: FileChangeEvent) => void
  enabled?: boolean
}

/**
 * File watcher hook for monitoring file system changes in a workspace
 *
 * Connects to the unified /ws/workspace endpoint and listens for file:* events.
 * Shares a single WebSocket connection with other workspace hooks (agent status, logs).
 *
 * **Purpose**: Real-time file system monitoring for editors and file viewers
 *
 * **Events Handled**:
 * - `file:created` - New file created in workspace
 * - `file:modified` - File content changed
 * - `file:deleted` - File removed from workspace
 *
 * @param options - Configuration options
 * @param options.workspaceId - Workspace ID to monitor
 * @param options.userId - Optional user ID (defaults to current auth user)
 * @param options.onFileChange - Callback fired on any file change event
 * @param options.enabled - Whether to connect (default: true)
 *
 * @returns File watcher state and controls
 *
 * @example
 * ```tsx
 * const { isConnected, lastEvent } = useFileWatcher({
 *   workspaceId: 'workspace-123',
 *   onFileChange: (event) => {
 *     console.log('File changed:', event.path, event.type)
 *   }
 * })
 * ```
 */
export function useFileWatcher({
  workspaceId,
  userId: userIdProp,
  onFileChange,
  enabled = true,
}: UseFileWatcherOptions) {
  const { profile } = useAuth()
  const userId = userIdProp || profile?.id
  const onFileChangeRef = useRef(onFileChange)
  const [lastEvent, setLastEvent] = useState<FileChangeEvent | null>(null)

  // Keep callback ref up to date
  useEffect(() => {
    onFileChangeRef.current = onFileChange
  }, [onFileChange])

  // Build message handlers for file watching
  const messageHandlers = useMemo(
    () => ({
      'connection:established': (message: FileChangeEvent) => {
        console.log('[FileWatcher] Connected to unified workspace socket')
      },
      'file:created': (message: FileChangeEvent) => {
        console.log('[FileWatcher] File created:', message.path)
        setLastEvent(message)
        if (onFileChangeRef.current) {
          onFileChangeRef.current(message)
        }
      },
      'file:modified': (message: FileChangeEvent) => {
        console.log('[FileWatcher] File modified:', message.path)
        setLastEvent(message)
        if (onFileChangeRef.current) {
          onFileChangeRef.current(message)
        }
      },
      'file:deleted': (message: FileChangeEvent) => {
        console.log('[FileWatcher] File deleted:', message.path)
        setLastEvent(message)
        if (onFileChangeRef.current) {
          onFileChangeRef.current(message)
        }
      },
    }),
    [],
  )

  // Build WebSocket URL for unified /ws/workspace endpoint
  const wsUrl = useMemo(
    () =>
      enabled && workspaceId && userId
        ? buildWorkspaceSocketUrl(workspaceId, userId)
        : '',
    [enabled, workspaceId, userId],
  )

  // Connect to unified WebSocket via WebSocketManager
  const { status, error, connect } = useWebSocket({
    url: wsUrl,
    messageHandlers,
    autoConnect: enabled && !!workspaceId && !!userId,
    onStatusChange: (status) => {
      console.log(
        `[FileWatcher] Connection status: ${status} (unified workspace socket)`,
      )
    },
    onError: (error) => {
      console.error('[FileWatcher] WebSocket error:', error)
    },
  })

  return {
    isConnected: status === 'connected',
    lastEvent,
    reconnect: connect,
    disconnect: () => {}, // Managed by WebSocketManager
  }
}
