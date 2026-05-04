/**
 * AgentBroadcaster - Broadcasts agent lifecycle events via WebSocket
 *
 * Listens to agent events from the EventBus and converts them to
 * WebSocket messages sent via the ConnectionManager.
 *
 * Provides backward-compatible API with the old AgentStatusService
 *
 * Scoping rules:
 * - Trigger executions: broadcast to entire workspace (all members see it)
 * - Manual/session/other executions: broadcast to the initiating user only
 */

import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { connectionManager } from '@realtime/websocket/connection-manager'
import { AgentStatus, AgentState, AgentStatusMessage, ExecutionType } from '@realtime/types'

const log = createLogger('agent-broadcaster')

/**
 * Build broadcast scope based on execution type.
 * Trigger executions are workspace-scoped (visible to all members).
 * All other executions (or events without executionType) are user-scoped.
 */
function buildAgentBroadcastScope(
  userId: string,
  workspaceId?: string,
  teamId?: string,
  executionType?: ExecutionType,
) {
  if (executionType === 'trigger') {
    return { workspaceId, teamId }
  }
  // Manual, session, specialist, or no executionType — scope to user
  return { userId, workspaceId, teamId }
}

/**
 * AgentBroadcaster class
 */
export class AgentBroadcaster {
  /** Agent state cache for reconnection scenarios */
  private agentStates: Map<string, AgentState> = new Map()

  constructor() {
    this.setupEventListeners()
    log.info('Initialized')
  }

  /**
   * Setup EventBus listeners
   */
  private setupEventListeners(): void {
    // Listen to agent started events
    eventBus.on(
      'agent:started',
      ({ agentId, userId, workspaceId, teamId, metadata, executionType }) => {
        this.agentStates.set(agentId, { status: 'executing', metadata })

        const message: AgentStatusMessage = {
          type: 'agent:started',
          agentId,
          status: 'executing',
          metadata: {
            ...metadata,
            startedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }

        connectionManager.broadcast(
          message,
          buildAgentBroadcastScope(userId, workspaceId, teamId, executionType),
        )

        log.info({ agentId, executionType: executionType ?? null }, 'Broadcast agent started')
      },
    )

    // Listen to agent stopped events
    eventBus.on('agent:stopped', ({ agentId, userId, workspaceId, executionId, executionType }) => {
      this.agentStates.set(agentId, { status: 'idle' })

      const message: AgentStatusMessage = {
        type: 'agent:stopped',
        agentId,
        status: 'idle',
        metadata: executionId ? { taskId: executionId } : undefined,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(
        message,
        buildAgentBroadcastScope(userId, workspaceId, undefined, executionType),
      )

      log.info({ agentId, executionId: executionId ?? null }, 'Broadcast agent stopped')
    })

    // Listen to agent progress events
    eventBus.on(
      'agent:progress',
      ({ agentId, userId, workspaceId, progress, metadata, executionType }) => {
        const currentState = this.agentStates.get(agentId)
        this.agentStates.set(agentId, {
          status: 'executing',
          metadata: {
            ...currentState?.metadata,
            ...metadata,
            progress,
          },
        })

        const message: AgentStatusMessage = {
          type: 'agent:progress',
          agentId,
          status: 'executing',
          metadata: {
            ...metadata,
            progress,
          },
          timestamp: new Date().toISOString(),
        }

        connectionManager.broadcast(
          message,
          buildAgentBroadcastScope(userId, workspaceId, undefined, executionType),
        )

        log.info(
          {
            agentId,
            description: metadata?.description ?? null,
          },
          'Broadcast agent progress',
        )
      },
    )

    // Listen to agent error events
    eventBus.on(
      'agent:error',
      ({ agentId, userId, workspaceId, error, executionId, executionType }) => {
        this.agentStates.set(agentId, { status: 'error', metadata: { error } })

        const message: AgentStatusMessage = {
          type: 'agent:error',
          agentId,
          status: 'error',
          metadata: { error, ...(executionId ? { taskId: executionId } : {}) },
          timestamp: new Date().toISOString(),
        }

        connectionManager.broadcast(
          message,
          buildAgentBroadcastScope(userId, workspaceId, undefined, executionType),
        )

        log.info({ agentId, error }, 'Broadcast agent error')
      },
    )

    // Listen to agent state-changed events (for comprehensive state tracking)
    eventBus.on('agent:state-changed', ({ agentId, workspaceId, newStatus, metadata }) => {
      this.agentStates.set(agentId, { status: newStatus, metadata })

      const message: AgentStatusMessage = {
        type: 'agent:status',
        agentId,
        status: newStatus,
        metadata,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { agentId, workspaceId })

      log.info({ agentId, newStatus, workspaceId: workspaceId ?? null }, 'Broadcast agent status')
    })
  }

  /**
   * Broadcast agent started event (programmatic API)
   *
   * @param agentId - Agent ID
   * @param metadata - Optional metadata (may include executionType)
   */
  broadcastAgentStarted(agentId: string, metadata?: any): void {
    // Extract context from metadata if available
    const userId = metadata?.userId
    const workspaceId = metadata?.workspace || metadata?.workspaceId
    const teamId = metadata?.teamId
    const executionType = metadata?.executionType as ExecutionType | undefined

    // Emit to EventBus (which will trigger our listener)
    eventBus.emit('agent:started', {
      agentId,
      userId: userId || 'unknown',
      workspaceId,
      teamId,
      metadata,
      executionType,
    })
  }

  /**
   * Broadcast agent stopped event (programmatic API)
   *
   * @param agentId - Agent ID
   */
  broadcastAgentStopped(
    agentId: string,
    userId?: string,
    workspaceId?: string,
    executionId?: string,
    executionType?: ExecutionType,
  ): void {
    eventBus.emit('agent:stopped', {
      agentId,
      userId: userId || 'unknown',
      workspaceId,
      executionId,
      executionType,
    })
  }

  /**
   * Broadcast agent progress event (programmatic API)
   *
   * @param agentId - Agent ID
   * @param metadata - Progress metadata (may include executionType)
   */
  broadcastAgentProgress(
    agentId: string,
    metadata: {
      taskId?: string
      userId?: string
      title?: string
      description?: string
      workspace?: string
      file?: string
      trigger?: string
      progress?: number
      emailId?: string
      logId?: string
      executionType?: string
      step?: string
      toolName?: string
      message?: string
      [key: string]: unknown
    },
  ): void {
    const workspaceId = metadata.workspace
    const userId = metadata.userId
    const executionType = metadata.executionType as ExecutionType | undefined

    eventBus.emit('agent:progress', {
      agentId,
      userId: userId || 'unknown',
      workspaceId,
      progress: metadata.progress,
      metadata,
      executionType,
    })
  }

  /**
   * Broadcast agent error event (programmatic API)
   *
   * @param agentId - Agent ID
   * @param error - Error message
   */
  broadcastAgentError(
    agentId: string,
    error: string,
    userId?: string,
    workspaceId?: string,
    executionId?: string,
    executionType?: ExecutionType,
  ): void {
    eventBus.emit('agent:error', {
      agentId,
      userId: userId || 'unknown',
      workspaceId,
      error,
      executionId,
      executionType,
    })
  }

  /**
   * Broadcast general agent status update (programmatic API)
   *
   * @param agentId - Agent ID
   * @param status - Agent status
   * @param metadata - Optional metadata
   */
  broadcastStatus(agentId: string, status: AgentStatus, metadata?: any): void {
    eventBus.emit('agent:state-changed', {
      agentId,
      previousStatus: this.agentStates.get(agentId)?.status || 'idle',
      newStatus: status,
      workspaceId: metadata?.workspaceId || metadata?.workspace,
      metadata,
    })
  }

  /**
   * Get current state of an agent
   *
   * @param agentId - Agent ID
   */
  getAgentState(agentId: string): AgentState | undefined {
    return this.agentStates.get(agentId)
  }

  /**
   * Get all agent states
   */
  getAllStates(): Map<string, AgentState> {
    return new Map(this.agentStates)
  }

  /**
   * Clear all agent states (for testing)
   */
  clearStates(): void {
    this.agentStates.clear()
    log.info('Cleared all agent states')
  }
}

// Export singleton instance
export const agentBroadcaster = new AgentBroadcaster()
