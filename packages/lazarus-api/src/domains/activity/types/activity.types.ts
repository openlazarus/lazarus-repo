/**
 * Activity and Memory logging types for Lazarus backend.
 *
 * These types match the frontend Log interface and enable tracking
 * of agent activities, tool calls, and memory operations.
 */

export type ChangeType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'connected'
  | 'disconnected'
  | 'indexed'
  | 'reindexed'
  | 'queried'
  | 'activated'
  | 'deactivated'
  | 'merged'
  | 'split'
  | 'experimental'
  | 'committed'
  | 'reverted'

export type ActorType = 'user' | 'agent' | 'system' | 'automation' | 'experiment'

export type LogType = 'system' | 'memory' | 'agent' | 'user' | 'experiment'

export type AppType =
  | 'database'
  | 'filesystem'
  | 'function'
  | 'datasource'
  | 'computation'
  | 'integration'

export type ExperimentStatus = 'running' | 'completed' | 'committed' | 'rejected'

// Execution status for activity logs
export type ExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'

// Trigger types for agent executions
export type TriggerType = 'user' | 'email' | 'webhook' | 'schedule' | 'manual'

// Platform source types for conversations
export type PlatformSource = 'discord' | 'slack' | 'email' | 'chat' | 'whatsapp'

/**
 * Conversation message for storing full transcript of agent executions.
 * Used to replay/display what an agent did during execution.
 */
export interface ConversationMessage {
  id: string
  role: 'assistant' | 'user' | 'system' | 'tool'
  content: string
  timestamp: Date
  // For tool calls
  toolName?: string
  toolInput?: any
  toolResult?: any
  // For thinking blocks
  isThinking?: boolean
  // Token tracking per message
  inputTokens?: number
  outputTokens?: number
}

/**
 * Track file changes during agent execution.
 */
export interface FileChange {
  path: string
  action: 'created' | 'modified' | 'deleted'
  timestamp: Date
  linesAdded?: number
  linesRemoved?: number
  // Optional content preview (can be large)
  contentPreview?: string
}

/**
 * Token usage metrics for an execution.
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost?: number // In USD based on model pricing
  model?: string
}

/**
 * Context about what triggered the execution.
 */
export interface ExecutionContext {
  triggeredBy: TriggerType
  triggerDetails?: any // Email subject, webhook payload, schedule name, etc.
  originalPrompt?: string // User's original message or trigger content
  conversationId?: string // Link to user chat conversation if applicable
}

export interface Actor {
  id: string
  type: ActorType
  name: string
  agentModel?: string
  agentPurpose?: string
  email?: string
  avatar?: string
}

export interface MemoryCellChange {
  id: string
  name: string
  changeType: ChangeType
  semanticIndices?: {
    time?: Date | string
    event?: string
    domain?: string[]
    tags?: string[]
    custom?: Record<string, any>
  }
  dataPointers?: Array<{
    type: string
    id: string
    source: string
  }>
  connectedCells?: string[]
  knowledgePackages?: string[]
  relevanceScore?: number
}

export interface AppUsage {
  id: string
  name: string
  type: AppType
  action: string
  parameters?: Record<string, any>
  affectedCells?: string[]
  result?: {
    status: 'success' | 'failure' | 'partial'
    message?: string
    data?: any
  }
  duration?: number
  resourceUsage?: {
    cpu?: number
    memory?: number
    io?: number
  }
}

export interface Change {
  type: ChangeType
  description: string
  intent?: string
  before?: any
  after?: any
  cascadingChanges?: Array<{
    cellId: string
    effect: string
  }>
}

export interface ExperimentContext {
  id: string
  name: string
  hypothesis: string
  parameters: Record<string, any>
  status: ExperimentStatus
  outcomes?: {
    predictions?: any[]
    insights?: string[]
    confidence?: number
  }
}

export interface TemporalContext {
  snapshotBefore?: string
  snapshotAfter?: string
  timelinePosition?: number
}

export interface ActivityLog {
  id: string
  title: string
  timestamp: Date
  actor: Actor
  type: LogType
  changes: Change[]
  workspaceId?: string
  memoryCells?: MemoryCellChange[]
  apps?: AppUsage[]
  systemLog?: string
  memoryLog?: string
  experiment?: ExperimentContext
  temporalContext?: TemporalContext
  metadata?: {
    category?: string
    tags?: string[]
    labels?: string[]
    sessionId?: string
    requestId?: string
    conversationId?: string
    totalDuration?: number
    memoryCellsQueried?: number
    memoryCellsModified?: number
    knowledgePackagesGenerated?: number
    environment?: 'development' | 'staging' | 'production'
    version?: string
    amount?: string
    client?: string
    dealStage?: string
    probability?: number
    [key: string]: any
  }
  parentLogId?: string
  relatedLogIds?: string[]
  workflowId?: string
  stepNumber?: number

  // NEW: Execution tracking fields
  /** Execution status - 'completed' is default for backward compatibility */
  status?: ExecutionStatus
  /** Full conversation transcript of agent execution */
  conversation?: ConversationMessage[]
  /** Files created, modified, or deleted during execution */
  filesModified?: FileChange[]
  /** Token usage metrics */
  tokenUsage?: TokenUsage
  /** Context about what triggered this execution */
  executionContext?: ExecutionContext

  // Platform integration fields for conversations
  /** The platform where this conversation originated (discord, slack, email, chat) */
  platformSource?: PlatformSource
  /** AI-generated title summarizing the conversation topic */
  conversationTitle?: string
  /** Platform-specific metadata (channel name, thread info, etc.) */
  platformMetadata?: {
    channelId?: string
    channelName?: string
    threadId?: string
    guildId?: string
    guildName?: string
    userName?: string
    userId?: string
  }
}

export interface MemorySummary {
  id: string
  workspaceId: string
  workflowId: string
  sessionId: string
  startTime: Date
  endTime: Date
  totalMemoryCellsQueried: number
  totalMemoryCellsModified: number
  totalKnowledgePackagesGenerated: number
  agentActivities: string[]
  summary: string
  keyInsights: string[]
  metadata?: Record<string, any>
}

export interface ActivityLogFilter {
  search?: string
  actors?: string[]
  actorTypes?: ActorType[]
  types?: LogType[]
  changeTypes?: ChangeType[]
  memoryCells?: string[]
  apps?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  labels?: string[]
  experimentStatus?: ExperimentStatus[]
  // NEW: Filter by execution status
  executionStatus?: ExecutionStatus[]
  // NEW: Filter by trigger type
  triggeredBy?: TriggerType[]
}

// Helper functions for creating activity logs

export function createAgentActivityLog(params: {
  title: string
  agentId: string
  agentName: string
  toolCalls: Array<{
    name: string
    action: string
    parameters?: any
    result?: any
    duration?: number
    intent?: string
  }>
  workspaceId?: string
  workflowId?: string
  metadata?: Record<string, any>
}): ActivityLog {
  const { title, agentId, agentName, toolCalls, workspaceId, workflowId, metadata } = params

  // Convert tool calls to AppUsage objects
  const apps: AppUsage[] = toolCalls.map((toolCall) => ({
    id: `app-${Math.random().toString(36).substr(2, 9)}`,
    name: toolCall.name,
    type: 'function' as AppType,
    action: toolCall.action,
    parameters: toolCall.parameters,
    result: toolCall.result,
    duration: toolCall.duration,
  }))

  // Create a change entry for each tool call
  const changes: Change[] = toolCalls.map((toolCall) => ({
    type: 'created' as ChangeType,
    description: `Executed ${toolCall.name}: ${toolCall.action}`,
    intent: toolCall.intent || 'Agent tool execution',
    after: toolCall.result,
  }))

  return {
    id: `log-${Math.random().toString(36).substr(2, 16)}`,
    title,
    timestamp: new Date(),
    actor: {
      id: agentId,
      type: 'agent' as ActorType,
      name: agentName,
      agentModel: metadata?.model,
    },
    type: 'agent' as LogType,
    changes,
    workspaceId,
    apps,
    workflowId,
    metadata,
  }
}

export function createSystemActivityLog(params: {
  title: string
  description: string
  workspaceId?: string
  metadata?: Record<string, any>
}): ActivityLog {
  const { title, description, workspaceId, metadata } = params

  return {
    id: `log-${Math.random().toString(36).substr(2, 16)}`,
    title,
    timestamp: new Date(),
    actor: {
      id: 'system',
      type: 'system' as ActorType,
      name: 'Lazarus System',
    },
    type: 'system' as LogType,
    changes: [
      {
        type: 'updated' as ChangeType,
        description,
      },
    ],
    workspaceId,
    systemLog: description,
    metadata,
  }
}

export function memorySummaryToActivityLog(summary: MemorySummary): ActivityLog {
  return {
    id: summary.id,
    title: 'Memory Operations Summary',
    timestamp: summary.endTime,
    actor: {
      id: 'memory-agent',
      type: 'agent' as ActorType,
      name: 'Memory Agent',
      agentModel: 'gpt-4',
      agentPurpose: 'Memory operations and knowledge synthesis',
    },
    type: 'memory' as LogType,
    changes: [
      {
        type: 'indexed' as ChangeType,
        description: `Processed ${summary.totalMemoryCellsQueried} memory cells`,
        intent: 'Knowledge synthesis and memory management',
      },
    ],
    workspaceId: summary.workspaceId,
    memoryLog: summary.summary,
    metadata: {
      sessionId: summary.sessionId,
      memoryCellsQueried: summary.totalMemoryCellsQueried,
      memoryCellsModified: summary.totalMemoryCellsModified,
      knowledgePackagesGenerated: summary.totalKnowledgePackagesGenerated,
      keyInsights: summary.keyInsights,
      relatedActivities: summary.agentActivities,
      ...summary.metadata,
    },
    workflowId: summary.workflowId,
    relatedLogIds: summary.agentActivities,
  }
}
