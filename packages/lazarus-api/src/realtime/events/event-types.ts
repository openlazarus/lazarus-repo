/**
 * Event type definitions for the EventBus
 *
 * This file defines all internal server-side events that can be emitted
 * through the EventBus. These events are distinct from WebSocket messages
 * and are used for internal communication between services.
 */

import { ExecutionState, ExecutionStatus, ExecutionType, AgentStatus } from '@realtime/types'

/**
 * All realtime event types
 */
export type RealtimeEventType =
  // Execution lifecycle events
  | 'execution:registered'
  | 'execution:updated'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'execution:state-changed'

  // Agent lifecycle events
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:progress'
  | 'agent:error'
  | 'agent:state-changed'

  // File system events
  | 'file:created'
  | 'file:modified'
  | 'file:deleted'
  | 'file:watch-started'
  | 'file:watch-stopped'

  // Workspace events
  | 'workspace:updated'
  | 'workspace:loaded'
  | 'workspace:unloaded'

  // Activity events
  | 'activity:new'
  | 'activity:logged'
  | 'activity:message-added'
  | 'activity:file-changed'
  | 'activity:status-changed'

  // Team events
  | 'team:updated'
  | 'team:member-added'
  | 'team:member-removed'

  // Approval events
  | 'approval:requested'
  | 'approval:resolved'

  // Custom events
  | 'custom'

/**
 * Event payload definitions for each event type
 * This ensures type safety when emitting and listening to events
 */
export interface RealtimeEventPayloads {
  // Execution events
  'execution:registered': {
    execution: ExecutionState
  }
  'execution:updated': {
    executionId: string
    execution: ExecutionState
    changes: {
      status?: ExecutionStatus
      metadata?: Record<string, any>
    }
  }
  'execution:completed': {
    executionId: string
    execution: ExecutionState
    duration: number
    success: boolean
  }
  'execution:failed': {
    executionId: string
    execution: ExecutionState
    error: string
  }
  'execution:cancelled': {
    executionId: string
    execution: ExecutionState
    reason?: string
  }
  'execution:state-changed': {
    executionId: string
    previousStatus: ExecutionStatus
    newStatus: ExecutionStatus
    execution: ExecutionState
  }

  // Agent events
  'agent:started': {
    agentId: string
    userId: string
    workspaceId?: string
    teamId?: string
    metadata?: any
    executionType?: ExecutionType
  }
  'agent:stopped': {
    agentId: string
    userId: string
    workspaceId?: string
    executionId?: string
    executionType?: ExecutionType
  }
  'agent:progress': {
    agentId: string
    userId: string
    workspaceId?: string
    progress?: number
    metadata?: any
    executionType?: ExecutionType
  }
  'agent:error': {
    agentId: string
    userId: string
    workspaceId?: string
    error: string
    executionId?: string
    executionType?: ExecutionType
  }
  'agent:state-changed': {
    agentId: string
    previousStatus: AgentStatus
    newStatus: AgentStatus
    workspaceId?: string
    metadata?: any
  }

  // File events
  'file:created': {
    workspaceId: string
    filePath: string
    fileType?: string
    size?: number
    userId?: string
  }
  'file:modified': {
    workspaceId: string
    filePath: string
    fileType?: string
    size?: number
    userId?: string
  }
  'file:deleted': {
    workspaceId: string
    filePath: string
  }
  'file:watch-started': {
    workspaceId: string
    userId: string
  }
  'file:watch-stopped': {
    workspaceId: string
  }

  // Workspace events
  'workspace:updated': {
    workspaceId: string
    userId: string
    teamId?: string
    changes: Record<string, any>
  }
  'workspace:loaded': {
    workspaceId: string
    userId: string
    teamId?: string
  }
  'workspace:unloaded': {
    workspaceId: string
  }

  // Activity events
  'activity:new': {
    workspaceId: string
    activityId: string
    activityType: string
    actorName: string
    title: string
  }
  'activity:logged': {
    workspaceId: string
    activityId: string
    activityLog: any // Full ActivityLog type from types/activity
  }
  'activity:message-added': {
    workspaceId: string
    activityId: string
    message: any // ConversationMessage
  }
  'activity:file-changed': {
    workspaceId: string
    activityId: string
    fileChange: any // FileChange
  }
  'activity:status-changed': {
    workspaceId: string
    activityId: string
    status: string
  }

  // Team events
  'team:updated': {
    teamId: string
    changes: Record<string, any>
  }
  'team:member-added': {
    teamId: string
    userId: string
    role: string
  }
  'team:member-removed': {
    teamId: string
    userId: string
  }

  // Approval events
  'approval:requested': {
    approvalId: string
    workspaceId: string
    agentId: string
    agentName: string
    executionId: string
    toolName: string
    description: string
    riskLevel: string
    createdAt: string
  }
  'approval:resolved': {
    approvalId: string
    workspaceId: string
    agentId: string
    executionId: string
    approved: boolean
    resolvedBy: string
  }

  // Custom events
  custom: {
    eventName: string
    data: any
  }
}

/**
 * Helper type for event handlers
 */
export type RealtimeEventHandler<T extends RealtimeEventType> = (
  payload: RealtimeEventPayloads[T],
) => void | Promise<void>
