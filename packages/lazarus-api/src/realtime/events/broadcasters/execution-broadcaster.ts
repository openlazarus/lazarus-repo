/**
 * ExecutionBroadcaster - Broadcasts execution lifecycle events via WebSocket
 *
 * Listens to execution events from the EventBus and converts them to
 * WebSocket messages sent via the ConnectionManager.
 *
 * Integrates with AgentBroadcaster for backward compatibility
 *
 * Scoping rules:
 * - Trigger executions: broadcast to entire workspace (all members see it)
 * - Manual/session executions: broadcast to the initiating user only
 */

import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { connectionManager } from '@realtime/websocket/connection-manager'
import { agentBroadcaster } from './agent-broadcaster'
import { ExecutionMessage, ExecutionState } from '@realtime/types'

const log = createLogger('execution-broadcaster')

/**
 * Build broadcast scope based on execution type.
 * Trigger executions are workspace-scoped (visible to all members).
 * Manual/session executions are user-scoped (visible to initiator only).
 */
function buildBroadcastScope(execution: ExecutionState) {
  if (execution.type === 'trigger') {
    return {
      workspaceId: execution.workspaceId,
      teamId: execution.teamId,
    }
  }
  // Manual, session, specialist — scope to the user who initiated
  return {
    userId: execution.userId,
    workspaceId: execution.workspaceId,
    teamId: execution.teamId,
  }
}

/**
 * ExecutionBroadcaster class
 */
export class ExecutionBroadcaster {
  constructor() {
    this.setupEventListeners()
    log.info('Initialized')
  }

  /**
   * Setup EventBus listeners
   */
  private setupEventListeners(): void {
    // Listen to execution registered events
    eventBus.on('execution:registered', ({ execution }) => {
      const message: ExecutionMessage = {
        type: 'execution:registered',
        executionId: execution.id,
        agentId: execution.agentId,
        userId: execution.userId,
        workspaceId: execution.workspaceId,
        teamId: execution.teamId,
        status: execution.status,
        metadata: execution.metadata,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, buildBroadcastScope(execution))

      // Also broadcast via AgentBroadcaster for backward compatibility
      agentBroadcaster.broadcastAgentStarted(execution.agentId, {
        taskId: execution.id,
        userId: execution.userId,
        title: execution.metadata.title || `${execution.type} execution`,
        description: execution.metadata.description,
        workspace: execution.workspaceId,
        trigger: execution.metadata.triggerId,
        emailId: execution.metadata.emailId,
        logId: execution.metadata.logId,
        startedAt: execution.startedAt.toISOString(),
        executionType: execution.type,
      })

      log.info(
        { executionId: execution.id, type: execution.type },
        'Broadcast execution registered',
      )
    })

    // Listen to execution updated events
    eventBus.on('execution:updated', ({ executionId, execution }) => {
      const message: ExecutionMessage = {
        type: 'execution:updated',
        executionId,
        agentId: execution.agentId,
        userId: execution.userId,
        workspaceId: execution.workspaceId,
        teamId: execution.teamId,
        status: execution.status,
        metadata: execution.metadata,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, buildBroadcastScope(execution))

      // Also broadcast via AgentBroadcaster for backward compatibility
      agentBroadcaster.broadcastAgentProgress(execution.agentId, {
        taskId: execution.id,
        userId: execution.userId,
        title: execution.metadata.title || `${execution.type} execution`,
        description: execution.metadata.description,
        workspace: execution.workspaceId,
        trigger: execution.metadata.triggerId,
        emailId: execution.metadata.emailId,
        progress: execution.metadata.progress,
        logId: execution.metadata.logId,
        executionType: execution.type,
        step: execution.metadata.step,
        toolName: execution.metadata.toolName,
        message: execution.metadata.message,
      })

      log.info({ executionId }, 'Broadcast execution updated')
    })

    // Listen to execution completed events
    eventBus.on('execution:completed', ({ executionId, execution, duration }) => {
      const message: ExecutionMessage = {
        type: 'execution:completed',
        executionId,
        agentId: execution.agentId,
        userId: execution.userId,
        workspaceId: execution.workspaceId,
        teamId: execution.teamId,
        status: execution.status,
        metadata: {
          ...execution.metadata,
          duration,
        },
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, buildBroadcastScope(execution))

      // Also broadcast via AgentBroadcaster for backward compatibility
      agentBroadcaster.broadcastAgentStopped(
        execution.agentId,
        execution.userId,
        execution.workspaceId,
        executionId,
        execution.type,
      )

      log.info({ executionId, durationMs: duration }, 'Broadcast execution completed')
    })

    // Listen to execution failed events
    eventBus.on('execution:failed', ({ executionId, execution, error }) => {
      const message: ExecutionMessage = {
        type: 'execution:failed',
        executionId,
        agentId: execution.agentId,
        userId: execution.userId,
        workspaceId: execution.workspaceId,
        teamId: execution.teamId,
        status: execution.status,
        metadata: {
          ...execution.metadata,
          error,
        },
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, buildBroadcastScope(execution))

      // Also broadcast via AgentBroadcaster for backward compatibility
      agentBroadcaster.broadcastAgentError(
        execution.agentId,
        error,
        execution.userId,
        execution.workspaceId,
        executionId,
        execution.type,
      )

      log.info({ executionId, error }, 'Broadcast execution failed')
    })

    // Listen to execution cancelled events
    eventBus.on('execution:cancelled', ({ executionId, execution, reason }) => {
      const message: ExecutionMessage = {
        type: 'execution:completed', // Use completed type with cancelled status
        executionId,
        agentId: execution.agentId,
        userId: execution.userId,
        workspaceId: execution.workspaceId,
        teamId: execution.teamId,
        status: execution.status,
        metadata: {
          ...execution.metadata,
          error: reason,
        },
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, buildBroadcastScope(execution))

      // Also broadcast via AgentBroadcaster for backward compatibility
      agentBroadcaster.broadcastAgentStopped(
        execution.agentId,
        execution.userId,
        execution.workspaceId,
        executionId,
        execution.type,
      )

      log.info({ executionId, reason: reason ?? null }, 'Broadcast execution cancelled')
    })
  }
}

// Export singleton instance
export const executionBroadcaster = new ExecutionBroadcaster()
