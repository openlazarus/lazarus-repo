'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import type { ExecutingTask } from '@/components/features/activity/execution-card'

import { buildWorkspaceSocketUrl } from '@/lib/websocket-utils'

import { useAuth } from './auth/use-auth'
import { useWebSocket } from './sockets/use-websocket'

// Backend message types
interface AgentStatusMessage {
  type:
    | 'agent:status'
    | 'agent:started'
    | 'agent:stopped'
    | 'agent:progress'
    | 'agent:error'
    | 'connection:established'
  agentId?: string
  status?: 'idle' | 'executing' | 'paused' | 'awaiting_approval' | 'error'
  metadata?: {
    taskId?: string
    title?: string
    description?: string
    workspace?: string
    file?: string
    trigger?: string
    progress?: number
    error?: string
    emailId?: string
    startedAt?: string
    // Progress details
    step?: 'thinking' | 'tool_use' | 'responding'
    toolName?: string
    message?: string
    // Email context
    emailContext?: {
      from: string
      subject: string
      preview?: string
      messageId?: string
    }
    // Activity log link
    logId?: string
  }
  timestamp: string
}

// Internal agent state tracking
interface AgentState {
  agentId: string
  status:
    | 'idle'
    | 'executing'
    | 'paused'
    | 'awaiting_approval'
    | 'error'
    | 'completed'
  metadata?: AgentStatusMessage['metadata']
  updateCount: number
  completedAt?: Date
}

export interface UseAgentStatusResult {
  tasks: ExecutingTask[]
  isConnected: boolean
  error: string | null
  reconnect: () => void
  dismissTask: (taskId: string) => void
  /** IDs of executions that recently finished — use to skip stale "executing" logs */
  recentlyCompleted: Set<string>
}

/**
 * Simple debounce function for message batching
 */
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Agent status hook for tracking real-time agent execution state
 *
 * Connects to the unified /ws/workspace endpoint and maintains stateful tracking
 * of all executing agents. Powers the global execution indicator UI in the header.
 *
 * **Purpose**: Stateful agent execution tracking for UI indicators and controls
 *
 * **Events Handled**:
 * - `agent:started` - Agent begins execution (adds to tasks list)
 * - `agent:progress` - Agent execution update (updates task state)
 * - `agent:status` - Agent status change
 * - `agent:stopped` - Agent completes (removes from tasks list)
 * - `agent:error` - Agent error (marks task as error state)
 *
 * **Features**:
 * - Maintains in-memory map of active agent states
 * - Transforms agent states to ExecutingTask[] for UI
 * - Debounces message updates (100ms) to reduce re-renders
 * - Shared WebSocket connection via WebSocketManager singleton
 *
 * For stop/start controls, use `useStopExecution` / `useStartExecution`
 * from `@/hooks/features/agents/use-execution-control`.
 *
 * @returns Agent status state and controls
 */
export function useAgentStatus(
  workspaceId?: string,
  onComplete?: () => void,
): UseAgentStatusResult {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<ExecutingTask[]>([])
  const [wsError, setWsError] = useState<string | null>(null)

  // Refs to prevent unnecessary re-renders
  const agentStatesRef = useRef<Map<string, AgentState>>(new Map())
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const recentlyCompletedRef = useRef<Set<string>>(new Set())
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(
    new Set(),
  )
  const MESSAGE_BATCH_DELAY = 100 // 100ms debounce

  // Transform backend agent state to frontend ExecutingTask
  const transformToTask = useCallback(
    (state: AgentState): ExecutingTask | null => {
      if (state.status === 'idle') {
        return null // Don't show idle agents (legacy, shouldn't happen)
      }

      const agentTitles: Record<string, string> = {
        'v0-specialist': 'v0 - UI/UX Specialist',
        'sqlite-specialist': 'SQLite Database Specialist',
        'librarian-specialist': 'Librarian - Knowledge Distillation',
      }

      // Use email context for title/description if available
      const emailContext = state.metadata?.emailContext
      const title = emailContext
        ? `Email from ${emailContext.from}`
        : agentTitles[state.agentId] || state.metadata?.title || state.agentId
      const description = emailContext
        ? emailContext.subject || 'No subject'
        : state.metadata?.description || 'Processing background task'

      return {
        id: state.metadata?.taskId || state.agentId,
        type: 'agent',
        title,
        description,
        status:
          state.status === 'completed'
            ? 'completed'
            : state.status === 'executing' ||
                state.status === 'paused' ||
                state.status === 'awaiting_approval' ||
                state.status === 'error'
              ? state.status
              : 'executing',
        workspace: state.metadata?.workspace,
        file: state.metadata?.file,
        trigger: state.metadata?.trigger,
        startedAt: state.metadata?.startedAt
          ? new Date(state.metadata.startedAt)
          : new Date(),
        completedAt: state.completedAt,
        progress: state.metadata?.progress,
        // Progress details
        step: state.metadata?.step,
        toolName: state.metadata?.toolName,
        message:
          state.status === 'error' && state.metadata?.error
            ? state.metadata.error
            : state.metadata?.message,
        // Email context
        emailContext: state.metadata?.emailContext,
        // Activity log link
        logId: state.metadata?.logId,
        // Agent identifier for matching
        agentId: state.agentId,
      }
    },
    [],
  )

  // Update tasks from agent states (immediate, non-debounced version)
  const updateTasksImmediate = useCallback(() => {
    const activeTasks: ExecutingTask[] = []
    for (const state of agentStatesRef.current.values()) {
      const task = transformToTask(state)
      if (task) {
        activeTasks.push(task)
      }
    }
    setTasks(activeTasks)
  }, [transformToTask])

  // Debounced version to batch rapid updates
  const updateTasks = useMemo(
    () => debounce(updateTasksImmediate, MESSAGE_BATCH_DELAY),
    [updateTasksImmediate],
  )

  // Build message handlers for WebSocketManager
  const messageHandlers = useMemo(
    () => ({
      'connection:established': (message: AgentStatusMessage) => {
        console.log(
          '[useAgentStatus] WebSocket connected via shared connection',
        )
        setWsError(null)
      },
      'agent:started': (message: AgentStatusMessage) => {
        if (message.agentId && message.status) {
          const executionId = message.metadata?.taskId || message.agentId
          console.log('[useAgentStatus] Agent started:', executionId)
          agentStatesRef.current.set(executionId, {
            agentId: message.agentId,
            status: message.status,
            metadata: message.metadata,
            updateCount: 0,
          })
          updateTasks()
        }
      },
      'agent:progress': (message: AgentStatusMessage) => {
        if (message.agentId && message.status) {
          const executionId = message.metadata?.taskId || message.agentId
          const existing = agentStatesRef.current.get(executionId)
          agentStatesRef.current.set(executionId, {
            agentId: message.agentId,
            status: message.status,
            metadata: {
              ...existing?.metadata,
              ...message.metadata,
            },
            updateCount: (existing?.updateCount || 0) + 1,
          })
          updateTasks()
        }
      },
      'agent:status': (message: AgentStatusMessage) => {
        if (message.agentId && message.status) {
          const executionId = message.metadata?.taskId || message.agentId
          const existing = agentStatesRef.current.get(executionId)
          agentStatesRef.current.set(executionId, {
            agentId: message.agentId,
            status: message.status,
            metadata: {
              ...existing?.metadata,
              ...message.metadata,
            },
            updateCount: (existing?.updateCount || 0) + 1,
          })
          updateTasks()
        }
      },
      'agent:stopped': (message: AgentStatusMessage) => {
        if (message.agentId) {
          const executionId = message.metadata?.taskId || message.agentId
          const existing = agentStatesRef.current.get(executionId)
          const logId = message.metadata?.logId || existing?.metadata?.logId
          console.log('[useAgentStatus] Agent stopped:', executionId)
          agentStatesRef.current.delete(executionId)
          if (logId) {
            recentlyCompletedRef.current.add(logId)
            setRecentlyCompleted(new Set(recentlyCompletedRef.current))
            setTimeout(() => {
              recentlyCompletedRef.current.delete(logId)
              setRecentlyCompleted(new Set(recentlyCompletedRef.current))
            }, 10000)
          }
          updateTasksImmediate()
          // Small delay to let DB commit before refreshing logs
          setTimeout(() => onCompleteRef.current?.(), 3000)
        }
      },
      'agent:error': (message: AgentStatusMessage) => {
        if (message.agentId) {
          const executionId = message.metadata?.taskId || message.agentId
          const existing = agentStatesRef.current.get(executionId)
          const logId = message.metadata?.logId || existing?.metadata?.logId
          console.log('[useAgentStatus] Agent error:', executionId)
          agentStatesRef.current.delete(executionId)
          if (logId) {
            recentlyCompletedRef.current.add(logId)
            setRecentlyCompleted(new Set(recentlyCompletedRef.current))
            setTimeout(() => {
              recentlyCompletedRef.current.delete(logId)
              setRecentlyCompleted(new Set(recentlyCompletedRef.current))
            }, 10000)
          }
          updateTasksImmediate()
          setTimeout(() => onCompleteRef.current?.(), 3000)
        }
      },
    }),
    [updateTasksImmediate],
  )

  // Build WebSocket URL for unified /ws/workspace endpoint
  // Pass workspaceId to scope broadcasts to this workspace only, preventing
  // cross-workspace task leaks when agents share the same ID across workspaces.
  const wsUrl = useMemo(
    () =>
      profile?.id && workspaceId
        ? buildWorkspaceSocketUrl(workspaceId, profile.id)
        : '',
    [workspaceId, profile?.id],
  )

  // Connect to unified WebSocket via WebSocketManager
  const { status, error, connect } = useWebSocket({
    url: wsUrl,
    messageHandlers,
    autoConnect: !!profile?.id && !!workspaceId,
    onStatusChange: (status) => {
      console.log(
        `[useAgentStatus] Connection status: ${status} (unified workspace socket)`,
      )
    },
    onError: (error) => {
      console.error('[useAgentStatus] WebSocket error:', error)
      setWsError(error)
    },
  })

  // Dismiss a task from the list
  const dismissTask = useCallback(
    (taskId: string) => {
      agentStatesRef.current.delete(taskId)
      updateTasksImmediate()
    },
    [updateTasksImmediate],
  )

  return {
    tasks,
    isConnected: status === 'connected',
    error: wsError || error,
    reconnect: connect,
    dismissTask,
    recentlyCompleted,
  }
}
