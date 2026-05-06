import { useCallback, useMemo } from 'react'

import { useAuth } from '@/hooks/auth/use-auth'
import { useWebSocket } from '@/hooks/sockets/use-websocket'
import { buildWorkspaceSocketUrl } from '@/lib/websocket-utils'
import { Log } from '@/model/log'
import { useActivityLogStore } from '@/store/activity-log-store'

interface UseLogsSocketOptions {
  workspaceId: string
  enabled?: boolean
  onLogCreated?: (log: Log) => void
  onLogUpdated?: (log: Log) => void
  onLogDeleted?: (logId: string) => void
  onExperimentStatusChanged?: (log: Log) => void
}

// Agent status message types from backend
interface AgentStatusMessage {
  type:
    | 'agent:status'
    | 'agent:started'
    | 'agent:stopped'
    | 'agent:progress'
    | 'agent:error'
    | 'execution:completed'
    | 'execution:failed'
    | 'connection:established'
  agentId?: string
  executionId?: string
  status?: 'idle' | 'executing' | 'paused' | 'error' | 'completed' | 'failed'
  metadata?: {
    taskId?: string
    title?: string
    description?: string
    workspace?: string
    file?: string
    trigger?: string
    progress?: number
    error?: string
    startedAt?: string
    duration?: number
  }
  timestamp: string
}

/**
 * Activity logs notification hook for triggering log list refreshes
 *
 * Connects to the unified /ws/workspace endpoint and triggers callbacks when
 * agent events occur. Now integrates directly with the Zustand activity log store
 * for immediate state updates.
 *
 * **Purpose**: Keep activity logs in sync with real-time events
 *
 * **Events Handled**:
 * - `agent:started` - Callback only (no refresh — live cards handled by useAgentStatus)
 * - `agent:progress` - No-op (handled by useAgentStatus)
 * - `agent:stopped` - Triggers store refresh (terminal event)
 * - `agent:error` - Triggers store refresh (terminal event)
 * - `connection:established` - Triggers store refresh (initial sync)
 *
 * @param options - Socket configuration options
 * @param options.workspaceId - Workspace ID to monitor
 * @param options.enabled - Whether to connect (default: true)
 * @param options.onLogCreated - Additional callback when new log entry created
 * @param options.onLogUpdated - Additional callback when log entry updated
 *
 * @returns Socket connection state
 */
export const useLogsSocket = (options: UseLogsSocketOptions) => {
  const {
    workspaceId,
    enabled = true,
    onLogCreated,
    onLogUpdated,
    onLogDeleted,
    onExperimentStatusChanged,
  } = options

  const { session } = useAuth()
  const userId = session?.user?.id || ''

  // Get store actions directly
  const refreshLogs = useActivityLogStore((state) => state.refreshLogs)

  // Stable refresh callback that updates the store
  const handleRefresh = useCallback(() => {
    if (workspaceId && userId) {
      console.log(
        '[Logs Socket] Triggering store refresh for workspace:',
        workspaceId,
      )
      refreshLogs(workspaceId, userId)
    }
  }, [workspaceId, userId, refreshLogs])

  // Build WebSocket URL for unified /ws/workspace endpoint
  const wsUrl = useMemo(
    () =>
      enabled && workspaceId && userId
        ? buildWorkspaceSocketUrl(workspaceId, userId)
        : '',
    [enabled, workspaceId, userId],
  )

  // Build message handlers for agent status events
  const messageHandlers = useMemo(
    () => ({
      'agent:started': (message: AgentStatusMessage) => {
        console.log(
          '[Logs Socket] Agent started:',
          message.agentId,
          message.metadata?.title,
        )
        // Do NOT refresh logs here — live execution cards are handled by useAgentStatus.
        // Refreshing on start pulls in recently completed logs from previous executions,
        // causing them to appear while the new execution is still running.
        if (onLogCreated) {
          onLogCreated({} as Log)
        }
      },
      'agent:progress': (_message: AgentStatusMessage) => {
        // Progress updates are handled by useAgentStatus (live execution cards).
        // Do NOT refresh logs here — it causes completed logs from previous
        // executions to appear mid-execution of the current one.
      },
      'agent:stopped': (message: AgentStatusMessage) => {
        console.log('[Logs Socket] Agent stopped:', message.agentId)
        // Refresh when agent completes
        handleRefresh()
        if (onLogUpdated) {
          onLogUpdated({} as Log)
        }
      },
      'agent:error': (message: AgentStatusMessage) => {
        console.log(
          '[Logs Socket] Agent error:',
          message.agentId,
          message.metadata?.error,
        )
        // Refresh on errors to show updated status
        handleRefresh()
        if (onLogUpdated) {
          onLogUpdated({} as Log)
        }
      },
      'execution:completed': (message: AgentStatusMessage) => {
        console.log(
          '[Logs Socket] Execution completed:',
          message.executionId,
          message.metadata?.duration,
        )
        // Do NOT refresh here — redundant with agent:stopped which is the terminal event.
        if (onLogUpdated) {
          onLogUpdated({} as Log)
        }
      },
      'execution:failed': (message: AgentStatusMessage) => {
        console.log(
          '[Logs Socket] Execution failed:',
          message.executionId,
          message.metadata?.error,
        )
        // Do NOT refresh here — redundant with agent:error which is the terminal event.
        if (onLogUpdated) {
          onLogUpdated({} as Log)
        }
      },
      'connection:established': (message: AgentStatusMessage) => {
        console.log('[Logs Socket] Connection established:', message.timestamp)
        // Initial refresh when connection is established to ensure we have latest data
        handleRefresh()
      },
      // Chat (and other non-tracked agent runs) emit `activity:new` from the
      // OTel span processor. Refresh the list so the new entry appears live.
      'activity:new': (_message: AgentStatusMessage) => {
        console.log('[Logs Socket] Activity new — refreshing logs')
        handleRefresh()
        if (onLogCreated) onLogCreated({} as Log)
      },
    }),
    [handleRefresh, onLogCreated, onLogUpdated],
  )

  // Connect to WebSocket
  const { status, error } = useWebSocket({
    url: wsUrl,
    messageHandlers,
    autoConnect: enabled && !!workspaceId && !!userId,
    onStatusChange: (status) => {
      console.log(`[Logs Socket] Status: ${status}`)
    },
    onError: (error) => {
      console.error('[Logs Socket] Error:', error)
    },
  })

  return {
    isConnected: status === 'connected',
    error,
  }
}
