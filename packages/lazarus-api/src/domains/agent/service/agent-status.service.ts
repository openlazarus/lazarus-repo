import WebSocket from 'ws'
import { executionCache } from '@realtime'
import type { AgentStatus, AgentStatusMessage } from '@domains/agent/types/agent.types'
import type { IAgentStatusService } from './agent-status.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('agent-status')

export type { AgentStatus, AgentStatusMessage }

interface ClientSubscription {
  ws: WebSocket
  userId: string
  workspaceId?: string
}

/**
 * Singleton service for broadcasting agent status updates via WebSocket
 */
export class AgentStatusService implements IAgentStatusService {
  private static instance: AgentStatusService | null = null
  private clients: Set<ClientSubscription> = new Set()
  private agentStates: Map<string, { status: AgentStatus; metadata?: any }> = new Map()

  private constructor() {
    log.info('Initialized')
  }

  static getInstance(): AgentStatusService {
    if (!AgentStatusService.instance) {
      AgentStatusService.instance = new AgentStatusService()
    }
    return AgentStatusService.instance
  }

  /**
   * Subscribe a WebSocket client to agent status updates
   */
  subscribe(ws: WebSocket, userId: string, workspaceId?: string): void {
    const subscription: ClientSubscription = { ws, userId, workspaceId }
    this.clients.add(subscription)

    log.info(`Client subscribed: userId=${userId}, workspaceId=${workspaceId || 'none'}`)
    log.info(`Total clients: ${this.clients.size}`)

    // Send current agent states to newly connected client
    this.sendInitialState(ws)
  }

  /**
   * Unsubscribe a WebSocket client
   */
  unsubscribe(ws: WebSocket): void {
    const subscription = Array.from(this.clients).find((s) => s.ws === ws)
    if (subscription) {
      this.clients.delete(subscription)
      log.info(`Client unsubscribed: userId=${subscription.userId}`)
      log.info(`Total clients: ${this.clients.size}`)
    }
  }

  /**
   * Send initial state to a newly connected client
   */
  private sendInitialState(ws: WebSocket): void {
    // Send agent-level status (legacy, for backward compatibility)
    if (this.agentStates.size > 0) {
      for (const [agentId, state] of this.agentStates.entries()) {
        const message: AgentStatusMessage = {
          type: 'agent:status',
          agentId,
          status: state.status,
          metadata: state.metadata,
          timestamp: new Date().toISOString(),
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message))
        }
      }
    }

    // Send execution-level data from cache (includes all running executions)
    const runningExecutions = executionCache.getRunning()

    if (runningExecutions.length > 0) {
      for (const execution of runningExecutions) {
        const message: AgentStatusMessage = {
          type: 'agent:progress', // Use progress type to indicate ongoing execution
          agentId: execution.agentId,
          status: 'executing',
          metadata: {
            taskId: execution.id,
            title: execution.metadata.title || `${execution.type} execution`,
            description: execution.metadata.description,
            workspace: execution.workspaceId,
            trigger: execution.metadata.triggerId,
            emailId: execution.metadata.emailId,
            progress: execution.metadata.progress,
            startedAt: execution.startedAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message))
        }
      }

      log.info(
        `Sent initial state: ${this.agentStates.size} agent states + ${runningExecutions.length} running executions`,
      )
    } else {
      log.info(`Sent initial state: ${this.agentStates.size} agent states, no running executions`)
    }
  }

  /**
   * Broadcast agent started event
   */
  broadcastAgentStarted(agentId: string, metadata?: any): void {
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

    this.broadcast(message)
    log.info(`Broadcast agent started: ${agentId}`)
  }

  /**
   * Broadcast agent stopped event
   */
  broadcastAgentStopped(agentId: string): void {
    this.agentStates.set(agentId, { status: 'idle' })

    const message: AgentStatusMessage = {
      type: 'agent:stopped',
      agentId,
      status: 'idle',
      timestamp: new Date().toISOString(),
    }

    this.broadcast(message)
    log.info(`Broadcast agent stopped: ${agentId}`)
  }

  /**
   * Broadcast agent progress update
   */
  broadcastAgentProgress(
    agentId: string,
    metadata: {
      taskId?: string
      title?: string
      description?: string
      workspace?: string
      file?: string
      trigger?: string
      progress?: number
      emailId?: string
    },
  ): void {
    const currentState = this.agentStates.get(agentId)
    this.agentStates.set(agentId, {
      status: 'executing',
      metadata: {
        ...currentState?.metadata,
        ...metadata,
      },
    })

    const message: AgentStatusMessage = {
      type: 'agent:progress',
      agentId,
      status: 'executing',
      metadata,
      timestamp: new Date().toISOString(),
    }

    this.broadcast(message)
    log.info(`Broadcast agent progress: ${agentId} - ${metadata.description || 'no description'}`)
  }

  /**
   * Broadcast agent error
   */
  broadcastAgentError(agentId: string, error: string): void {
    this.agentStates.set(agentId, { status: 'error', metadata: { error } })

    const message: AgentStatusMessage = {
      type: 'agent:error',
      agentId,
      status: 'error',
      metadata: { error },
      timestamp: new Date().toISOString(),
    }

    this.broadcast(message)
    log.info(`Broadcast agent error: ${agentId} - ${error}`)
  }

  /**
   * Broadcast general status update
   */
  broadcastStatus(agentId: string, status: AgentStatus, metadata?: any): void {
    this.agentStates.set(agentId, { status, metadata })

    const message: AgentStatusMessage = {
      type: 'agent:status',
      agentId,
      status,
      metadata,
      timestamp: new Date().toISOString(),
    }

    this.broadcast(message)
    log.info(`Broadcast status: ${agentId} - ${status}`)
  }

  /**
   * Get current state of an agent
   */
  getAgentState(agentId: string): { status: AgentStatus; metadata?: any } | undefined {
    return this.agentStates.get(agentId)
  }

  /**
   * Get all agent states
   */
  getAllStates(): Map<string, { status: AgentStatus; metadata?: any }> {
    return new Map(this.agentStates)
  }

  /**
   * Broadcast a custom message to workspace
   */
  broadcastToWorkspace(workspaceId: string, message: any): void {
    const wrappedMessage = {
      type: 'custom',
      workspaceId,
      ...message,
      timestamp: new Date().toISOString(),
    }
    this.broadcast(wrappedMessage as AgentStatusMessage)
  }

  /**
   * Broadcast a message to all connected clients
   */
  private broadcast(message: AgentStatusMessage): void {
    const messageStr = JSON.stringify(message)
    let successCount = 0
    let failureCount = 0

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        try {
          subscription.ws.send(messageStr)
          successCount++
        } catch (error) {
          log.error({ err: error }, `Error sending to client:`)
          failureCount++
        }
      } else {
        // Remove dead connections
        this.clients.delete(subscription)
        failureCount++
      }
    })

    if (failureCount > 0) {
      log.info(`Broadcast complete: ${successCount} sent, ${failureCount} failed/removed`)
    }
  }

  /**
   * Clear all agent states (useful for testing)
   */
  clearStates(): void {
    this.agentStates.clear()
    log.info('Cleared all agent states')
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size
  }
}

// Export singleton instance
export const agentStatusService: IAgentStatusService = AgentStatusService.getInstance()
