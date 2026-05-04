import type WebSocket from 'ws'
import type { AgentStatus } from '@domains/agent/types/agent.types'

export interface IAgentStatusService {
  /** Subscribe a WebSocket client to agent status updates. */
  subscribe(ws: WebSocket, userId: string, workspaceId?: string): void

  /** Unsubscribe a WebSocket client. */
  unsubscribe(ws: WebSocket): void

  /** Broadcast agent started event. */
  broadcastAgentStarted(agentId: string, metadata?: any): void

  /** Broadcast agent stopped event. */
  broadcastAgentStopped(agentId: string): void

  /** Broadcast agent progress update. */
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
  ): void

  /** Broadcast agent error. */
  broadcastAgentError(agentId: string, error: string): void

  /** Broadcast general status update. */
  broadcastStatus(agentId: string, status: AgentStatus, metadata?: any): void

  /** Get current state of an agent. */
  getAgentState(agentId: string): { status: AgentStatus; metadata?: any } | undefined

  /** Get all agent states. */
  getAllStates(): Map<string, { status: AgentStatus; metadata?: any }>

  /** Broadcast a custom message to workspace. */
  broadcastToWorkspace(workspaceId: string, message: any): void

  /** Clear all agent states. */
  clearStates(): void

  /** Get number of connected clients. */
  getClientCount(): number
}
