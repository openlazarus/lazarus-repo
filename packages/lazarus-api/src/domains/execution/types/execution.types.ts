/**
 * Execution types
 */
export type ExecutionType = 'trigger' | 'specialist' | 'manual' | 'session'

/**
 * Execution status lifecycle
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

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

export interface ExecutionContextData {
  agentId: string
  workspaceId: string
  userId: string
  workspacePath: string
  executionId?: string
  browserExecutionTs?: string
  cascadeDepth?: number
  platformSource?: string
  platformMetadata?: Record<string, any>
  /** Suspend the caller's inactivity timer (e.g., while a delegated agent awaits approval). */
  suspendInactivityTimer?: () => void
  /** Resume the caller's inactivity timer after suspension. */
  resumeInactivityTimer?: () => void
  /** Suspend the caller's total-execution timer while a child delegation runs (the child has its own budget). */
  suspendExecutionTimer?: () => void
  /** Resume the caller's total-execution timer after the child returns. */
  resumeExecutionTimer?: () => void
  /** Update the caller's execution status (propagate awaiting_approval from child). */
  setExecutionStatus?: (status: 'awaiting_approval' | 'running') => void
}

export interface ExecutionSlotRequest {
  executionId: string
  agentId: string
  workspaceId: string
}

export interface ExecutionQueueStats {
  running: number
  queued: number
  maxConcurrent: number
  maxQueued: number
  totalProcessed: number
  totalSkippedDedup: number
  totalQueueFull: number
  totalRecovered: number
  activeAgents: string[]
}

/** Result of attempting to run through the queue */
export type QueueResult<T> =
  | { status: 'executed'; value: T }
  | { status: 'skipped'; reason: 'agent_already_active' }
  | { status: 'queue_full' }
