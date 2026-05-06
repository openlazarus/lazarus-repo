/**
 * Shared type definitions for the Realtime module
 *
 * This module consolidates all real-time functionality including:
 * - WebSocket connections and broadcasting
 * - Execution tracking and caching
 * - Activity logging
 * - File watching
 * - Event bus
 */

import WebSocket from 'ws'
import type { AgentStatus, AgentStatusMessage } from '../domains/agent/types/agent.types'

export type { AgentStatus, AgentStatusMessage }

// ============================================================================
// Execution Types (realtime layer; service cache types: src/types/execution/execution.types.ts)
// ============================================================================

/**
 * Execution types
 */
export type ExecutionType = 'trigger' | 'specialist' | 'manual' | 'session'

/**
 * Execution status lifecycle
 */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Core execution state structure
 */
export interface ExecutionState {
  /** Unique execution ID */
  id: string

  /** Type of execution */
  type: ExecutionType

  /** Agent executing this task */
  agentId: string

  /** User who initiated (or owns the agent) */
  userId: string

  /** Workspace context (optional) */
  workspaceId?: string

  /** Team context (optional) */
  teamId?: string

  /** Current execution status */
  status: ExecutionStatus

  /** When execution started */
  startedAt: Date

  /** Last activity timestamp (for heartbeat/timeout detection) */
  lastActivity: Date

  /** When execution completed (optional) */
  completedAt?: Date

  /** Duration in milliseconds (optional, calculated on completion) */
  duration?: number

  /** Execution metadata */
  metadata: ExecutionMetadata
}

/**
 * Execution metadata (type-specific details)
 */
export interface ExecutionMetadata {
  /** Human-readable title */
  title?: string

  /** Description of what's being executed */
  description?: string

  /** Trigger ID (for trigger-based executions) */
  triggerId?: string

  /** Email ID (for email-triggered or specialist executions) */
  emailId?: string

  /** Session ID (for session-based executions) */
  sessionId?: string

  /** File being processed (optional) */
  file?: string

  /** Progress percentage 0-100 (optional) */
  progress?: number

  /** Error message (if failed) */
  error?: string

  /** Additional custom data */
  [key: string]: any
}

/**
 * Parameters for registering a new execution
 */
export interface RegisterExecutionParams {
  id?: string // Optional - will generate UUID if not provided
  type: ExecutionType
  agentId: string
  userId: string
  workspaceId?: string
  teamId?: string
  status?: ExecutionStatus // Defaults to 'running'
  metadata?: ExecutionMetadata
}

/**
 * Parameters for updating an execution
 */
export interface UpdateExecutionParams {
  status?: ExecutionStatus
  metadata?: Partial<ExecutionMetadata>
}

// ============================================================================
// Agent Status Types (canonical: src/types/agent/agent.types.ts)
// ============================================================================

/**
 * Agent state snapshot
 */
export interface AgentState {
  status: AgentStatus
  metadata?: any
}

// ============================================================================
// WebSocket Subscription Types
// ============================================================================

/**
 * WebSocket subscription context
 * Defines what events a client should receive based on their context
 */
export interface SubscriptionContext {
  /** WebSocket connection */
  ws: WebSocket

  /** User ID of the subscriber */
  userId: string

  /** Optional workspace ID filter */
  workspaceId?: string

  /** Optional team ID filter */
  teamId?: string

  /** Optional event type filters */
  filters?: {
    /** Filter by specific agent IDs */
    agentIds?: string[]

    /** Filter by specific event types */
    eventTypes?: string[]

    /** Filter by execution types */
    executionTypes?: ExecutionType[]
  }
}

/**
 * Event scope for targeted broadcasting
 */
export interface EventScope {
  /** Target specific user */
  userId?: string

  /** Target specific workspace */
  workspaceId?: string

  /** Target specific team */
  teamId?: string

  /** Target specific agent */
  agentId?: string
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * All possible WebSocket message types
 */
export type WebSocketMessageType =
  // Connection events
  | 'connection:established'
  | 'connection:ping'
  | 'connection:pong'
  // Agent events
  | 'agent:status'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:progress'
  | 'agent:error'
  // Execution events
  | 'execution:registered'
  | 'execution:updated'
  | 'execution:completed'
  | 'execution:failed'
  // File events
  | 'file:created'
  | 'file:modified'
  | 'file:deleted'
  // Workspace events
  | 'workspace:updated'
  // Activity events
  | 'activity:new'
  // Team events
  | 'team:updated'
  // Approval events
  | 'approval:requested'
  | 'approval:resolved'

/**
 * Base WebSocket message structure
 */
export interface BaseWebSocketMessage {
  type: WebSocketMessageType
  timestamp: string
}

/**
 * Connection message
 */
export interface ConnectionMessage extends BaseWebSocketMessage {
  type: 'connection:established' | 'connection:ping' | 'connection:pong'
  message?: string
}

/**
 * Execution message
 */
export interface ExecutionMessage extends BaseWebSocketMessage {
  type: 'execution:registered' | 'execution:updated' | 'execution:completed' | 'execution:failed'
  executionId: string
  agentId: string
  userId: string
  workspaceId?: string
  teamId?: string
  status: ExecutionStatus
  metadata: ExecutionMetadata
}

/**
 * File change message
 */
export interface FileMessage extends BaseWebSocketMessage {
  type: 'file:created' | 'file:modified' | 'file:deleted'
  workspace: string // Changed from workspaceId for frontend compatibility
  path: string // Changed from filePath for frontend compatibility
  fileType?: string
  size?: number
  userId?: string // User who caused the file change (undefined for chokidar/agent events)
}

/**
 * Workspace message
 */
export interface WorkspaceMessage extends BaseWebSocketMessage {
  type: 'workspace:updated'
  workspaceId: string
  changes: Record<string, any>
}

/**
 * Activity message
 */
export interface ActivityMessage extends BaseWebSocketMessage {
  type: 'activity:new'
  workspaceId: string
  activityId: string
  activityType: string
  actorName: string
  title: string
}

/**
 * Team message
 */
export interface TeamMessage extends BaseWebSocketMessage {
  type: 'team:updated'
  teamId: string
  changes: Record<string, any>
}

/**
 * Approval message (pending approval requested/resolved)
 */
export interface ApprovalMessage extends BaseWebSocketMessage {
  type: 'approval:requested' | 'approval:resolved'
  approvalId: string
  workspaceId: string
  agentId: string
  agentName?: string
  executionId: string
  toolName?: string
  description?: string
  riskLevel?: string
  approved?: boolean
  resolvedBy?: string
  createdAt?: string
}

/**
 * Union of all WebSocket message types
 */
export type WebSocketMessage =
  | ConnectionMessage
  | AgentStatusMessage
  | ExecutionMessage
  | FileMessage
  | WorkspaceMessage
  | ActivityMessage
  | TeamMessage
  | ApprovalMessage

// ============================================================================
// Event Bus Types
// ============================================================================

/**
 * Internal server-side event types (not necessarily sent via WebSocket)
 */
export type InternalEventType =
  | 'execution:state-changed'
  | 'agent:state-changed'
  | 'file:watch-started'
  | 'file:watch-stopped'
  | 'workspace:loaded'
  | 'workspace:unloaded'
  | 'activity:logged'
  | 'custom'

/**
 * Event payloads for each internal event type
 */
export interface InternalEventPayloads {
  'execution:state-changed': {
    executionId: string
    previousStatus: ExecutionStatus
    newStatus: ExecutionStatus
    execution: ExecutionState
  }
  'agent:state-changed': {
    agentId: string
    previousStatus: AgentStatus
    newStatus: AgentStatus
    metadata?: any
  }
  'file:watch-started': {
    workspaceId: string
    userId: string
  }
  'file:watch-stopped': {
    workspaceId: string
  }
  'workspace:loaded': {
    workspaceId: string
    userId: string
    teamId?: string
  }
  'workspace:unloaded': {
    workspaceId: string
  }
  'activity:logged': {
    workspaceId: string
    activityId: string
    activityLog: any // Import from types/activity when needed
  }
  custom: {
    eventName: string
    data: any
  }
}

// ============================================================================
// Execution Tracker Types (Fluent API)
// ============================================================================

/**
 * Fluent API interface for tracking execution lifecycle
 */
export interface ExecutionTracker {
  /** Get the current execution state */
  getState(): ExecutionState

  /** Update execution progress */
  progress(percent: number, description?: string): ExecutionTracker

  /** Update execution metadata */
  update(metadata: Partial<ExecutionMetadata>): ExecutionTracker

  /** Mark execution as completed */
  complete(metadata?: Partial<ExecutionMetadata>): ExecutionTracker

  /** Mark execution as failed */
  fail(error: string, metadata?: Partial<ExecutionMetadata>): ExecutionTracker

  /** Cancel execution */
  cancel(reason?: string): ExecutionTracker
}
