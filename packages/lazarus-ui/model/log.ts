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

export type ActorType =
  | 'user'
  | 'agent'
  | 'system'
  | 'automation'
  | 'experiment'

// Platform source types for conversations
export type PlatformSource = 'discord' | 'slack' | 'email' | 'chat'

// Execution status types
export type ExecutionStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'

// Trigger types for agent executions
export type TriggerType = 'user' | 'email' | 'webhook' | 'schedule' | 'manual'

// Token usage metrics for an execution
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost?: number
  model?: string
}

// Context about what triggered the execution
export interface ExecutionContext {
  triggeredBy: TriggerType
  triggerDetails?: any
  originalPrompt?: string
  conversationId?: string
}

// Track file changes during agent execution
export interface FileChange {
  path: string
  action: 'created' | 'modified' | 'deleted'
  timestamp: Date | string
  linesAdded?: number
  linesRemoved?: number
  contentPreview?: string
}

export interface Actor {
  id: string
  type: ActorType
  name: string
  agentModel?: string // For AI agents, which model they're using
  agentPurpose?: string // What the agent is designed to do
  email?: string // For human users
  avatar?: string
}

// Memory cells are the core knowledge packages
export interface MemoryCellChange {
  id: string
  name: string

  // Semantic indexing attributes
  semanticIndices?: {
    time?: Date | string
    event?: string
    domain?: string[]
    tags?: string[]
    custom?: Record<string, any>
  }

  // What happened to this memory cell
  changeType: ChangeType

  // Pointers to data elements this cell references
  dataPointers?: {
    type: string
    id: string
    source: string
  }[]

  // Other memory cells this connects to
  connectedCells?: string[]

  // Knowledge package this cell contributes to
  knowledgePackages?: string[]

  // Semantic similarity/relevance score if queried
  relevanceScore?: number
}

// Apps are the tools/infrastructure (database, file system, functions, etc.)
export interface AppUsage {
  id: string
  name: string
  type:
    | 'database'
    | 'filesystem'
    | 'function'
    | 'datasource'
    | 'computation'
    | 'integration'

  action: string // What the app did
  parameters?: Record<string, any>

  // Memory cells affected by this app usage
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

// Changes represent the evolution of the knowledge graph
export interface Change {
  type: ChangeType
  description: string

  // What was the semantic intent of this change
  intent?: string

  // Before and after states for reversibility
  before?: any
  after?: any

  // Ripple effects through the knowledge graph
  cascadingChanges?: {
    cellId: string
    effect: string
  }[]
}

export interface ExperimentContext {
  id: string
  name: string
  hypothesis: string

  // Parameters of the what-if scenario
  parameters: Record<string, any>

  // Whether this experiment was committed to production
  status: 'running' | 'completed' | 'committed' | 'rejected'

  // Results and learnings
  outcomes?: {
    predictions?: any[]
    insights?: string[]
    confidence?: number
  }
}

export interface Log {
  id: string
  title: string
  timestamp: Date

  // Who or what initiated this activity
  actor: Actor

  // High-level categorization
  type: 'system' | 'memory' | 'agent' | 'user' | 'experiment'

  // Workspace context - which workspace this activity belongs to
  workspaceId: string
  workspaceName?: string // Optional denormalized workspace name for display

  // Execution status
  status?: ExecutionStatus

  // The changes to the knowledge graph
  changes: Change[]

  // Memory cells that were involved
  memoryCells?: MemoryCellChange[]

  // Apps (tools/infrastructure) that were used
  apps?: AppUsage[]

  // System-generated log for technical details
  systemLog?: string

  // AI-generated narrative of what happened and why it matters
  memoryLog?: string

  // For experimental/simulation runs
  experiment?: ExperimentContext

  // Temporal context for wayback machine
  temporalContext?: {
    snapshotBefore?: string // ID of memory state before
    snapshotAfter?: string // ID of memory state after
    timelinePosition?: number
  }

  // Metadata for filtering and analysis
  metadata?: {
    category?: string
    tags?: string[]
    labels?: string[]

    // Session tracking
    sessionId?: string
    requestId?: string
    conversationId?: string

    // Performance metrics
    totalDuration?: number
    memoryCellsQueried?: number
    memoryCellsModified?: number
    knowledgePackagesGenerated?: number

    // Environment
    environment?: 'development' | 'staging' | 'production'
    version?: string

    // Additional fields for UI display
    amount?: string
    client?: string
    dealStage?: string
    probability?: number
  }

  // Relationships to other logs
  parentLogId?: string
  relatedLogIds?: string[]

  // For tracking activity chains
  workflowId?: string
  stepNumber?: number

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
  /** Full conversation transcript */
  conversation?: Array<{
    id: string
    role: 'assistant' | 'user' | 'system' | 'tool'
    content: string
    timestamp: Date
    toolName?: string
    toolInput?: any
    toolResult?: any
    isThinking?: boolean
  }>

  /** Token usage metrics */
  tokenUsage?: TokenUsage
  /** Context about what triggered this execution */
  executionContext?: ExecutionContext
  /** Files created, modified, or deleted during execution */
  filesModified?: FileChange[]
}

// Helper functions for creating different types of logs
export const createMemoryLog = (
  title: string,
  actor: Actor,
  changes: Change[],
  memoryCells: MemoryCellChange[],
  workspaceId: string,
  apps?: AppUsage[],
  memoryLog?: string,
): Omit<Log, 'id' | 'timestamp'> => ({
  title,
  type: 'memory',
  actor,
  changes,
  memoryCells,
  workspaceId,
  apps,
  memoryLog,
})

export const createAgentLog = (
  title: string,
  actor: Actor,
  changes: Change[],
  workspaceId: string,
  memoryCells?: MemoryCellChange[],
  apps?: AppUsage[],
  memoryLog?: string,
): Omit<Log, 'id' | 'timestamp'> => ({
  title,
  type: 'agent',
  actor,
  changes,
  workspaceId,
  memoryCells,
  apps,
  memoryLog,
})

export const createExperimentLog = (
  title: string,
  actor: Actor,
  experiment: ExperimentContext,
  changes: Change[],
  workspaceId: string,
  memoryCells?: MemoryCellChange[],
): Omit<Log, 'id' | 'timestamp'> => ({
  title,
  type: 'experiment',
  actor,
  experiment,
  changes,
  workspaceId,
  memoryCells,
})

export const createSystemLog = (
  title: string,
  systemLog: string,
  changes: Change[],
  workspaceId: string,
  metadata?: Log['metadata'],
): Omit<Log, 'id' | 'timestamp'> => ({
  title,
  type: 'system',
  actor: {
    id: 'system',
    type: 'system',
    name: 'Lazarus System',
  },
  changes,
  workspaceId,
  systemLog,
  metadata,
})

export interface LogFilter {
  search?: string
  actors?: string[]
  actorTypes?: ActorType[]
  types?: Log['type'][]
  changeTypes?: ChangeType[]
  memoryCells?: string[]
  apps?: string[]
  workspaces?: string[] // Filter by workspace IDs
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  labels?: string[]
  experimentStatus?: ExperimentContext['status'][]
}

export const createLogFromSupabase = (data: any): Log => {
  return {
    id: data.id,
    title: data.title,
    timestamp: new Date(data.timestamp || data.created_at),
    actor: data.actor || {
      id: data.actor_id,
      type: data.actor_type,
      name: data.actor_name,
      email: data.actor_email,
      avatar: data.actor_avatar,
      agentModel: data.agent_model,
      agentPurpose: data.agent_purpose,
    },
    type: data.type,
    workspaceId: data.workspace_id || data.workspaceId,
    workspaceName: data.workspace_name || data.workspaceName,
    changes: data.changes || [],
    memoryCells: data.memory_cells || data.memoryCells || [],
    apps: data.apps || [],
    systemLog: data.system_log || data.systemLog,
    memoryLog: data.memory_log || data.memoryLog,
    experiment: data.experiment,
    temporalContext: data.temporal_context || data.temporalContext,
    metadata: data.metadata || {},
    parentLogId: data.parent_log_id || data.parentLogId,
    relatedLogIds: data.related_log_ids || data.relatedLogIds || [],
    workflowId: data.workflow_id || data.workflowId,
    stepNumber: data.step_number || data.stepNumber,
    // Platform integration fields
    status: data.status,
    platformSource: data.platform_source || data.platformSource,
    conversationTitle: data.conversation_title || data.conversationTitle,
    platformMetadata: data.platform_metadata || data.platformMetadata,
    conversation: data.conversation,
    // Execution metrics
    tokenUsage: data.token_usage || data.tokenUsage,
    executionContext: data.execution_context || data.executionContext,
    filesModified: data.files_modified || data.filesModified,
  }
}

export const getLogSummary = (log: Log): string => {
  const entityCount = log.memoryCells?.length || 0
  const appCount = log.apps?.length || 0
  const changeCount = log.changes.length

  return `${changeCount} changes affecting ${entityCount} memory cells using ${appCount} apps`
}

export const getAffectedEntitiesCount = (
  log: Log,
): {
  added: number
  modified: number
  removed: number
} => {
  const counts = {
    added: 0,
    modified: 0,
    removed: 0,
  }

  log.memoryCells?.forEach((cell) => {
    switch (cell.changeType) {
      case 'created':
      case 'indexed':
        counts.added++
        break
      case 'deleted':
      case 'deactivated':
        counts.removed++
        break
      default:
        counts.modified++
    }
  })

  return counts
}

export const formatTemporalContext = (log: Log): string => {
  const now = new Date()
  const logTime = new Date(log.timestamp)
  const diffMs = now.getTime() - logTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hr ago`
  if (diffDays < 7) return `${diffDays} days ago`

  return logTime.toLocaleDateString()
}

export const selectActivityView = (log: Log) => ({
  id: log.id,
  type: log.type,
  action: log.title,
  timestamp: formatTemporalContext(log),
  memoryCells: log.memoryCells?.map((mc) => mc.id) || [],
  affectedEntities: getAffectedEntitiesCount(log),
  tools:
    log.apps?.map((app) => ({
      name: app.name,
      logo: `/icons/logos/${app.name.toLowerCase().replace(/\s+/g, '-')}-logo.svg`,
    })) || [],
  actor: {
    name: log.actor.name,
    type: log.actor.type === 'agent' ? 'agent' : 'user',
    avatar: log.actor.avatar,
    initials: log.actor.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2),
    gradient:
      log.actor.type === 'agent'
        ? generateAgentGradient(log.actor.id)
        : undefined,
  },
  metadata: log.metadata,
})

/**
 * Format a duration in milliseconds to a human-readable string.
 * Examples: "3s", "1m 24s", "2h 5m"
 */
export const formatDuration = (ms: number | undefined): string => {
  if (!ms || ms <= 0) return '--'
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

/**
 * Format a cost in USD.
 * Examples: "$0.01", "$1.23", "$12.50"
 */
export const formatCost = (usd: number | undefined): string => {
  if (usd === undefined || usd === null) return ''
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

/**
 * Format token count to a compact string.
 * Examples: "1.2k", "48.7k", "1.2M"
 */
export const formatTokenCount = (tokens: number | undefined): string => {
  if (!tokens) return '--'
  if (tokens < 1000) return `${tokens}`
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}k`
  return `${(tokens / 1_000_000).toFixed(1)}M`
}

const generateAgentGradient = (agentId: string): string => {
  // Special gradient for Lazarus System (AI librarian)
  if (agentId === 'lazarus-system') {
    return 'linear-gradient(135deg, #0098FC 0%, #00D4FF 100%)'
  }

  const gradients = [
    'radial-gradient(circle at 30% 20%, rgba(0, 119, 255, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 212, 255, 0.3), transparent 50%), radial-gradient(circle at 40% 80%, rgba(0, 149, 255, 0.2), transparent 50%), linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
    'radial-gradient(ellipse at top left, rgba(255, 149, 0, 0.2), transparent 40%), radial-gradient(ellipse at bottom right, rgba(255, 94, 77, 0.2), transparent 40%), linear-gradient(45deg, #ffeaa7 0%, #fab1a0 100%)',
    'radial-gradient(circle at 30% 20%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.2), transparent 50%), linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  ]

  const hash = agentId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}
