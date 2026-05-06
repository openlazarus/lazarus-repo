export type Actor = {
  id: string
  type: 'user' | 'agent' | 'system' | 'automation' | 'experiment'
  name: string
  agentModel?: string
  agentPurpose?: string
  email?: string
  avatar?: string
}

export type MemoryCellChange = {
  id: string
  name: string
  changeType: string
}

export type AppUsage = {
  id: string
  name: string
  type: string
  action: string
  parameters?: Record<string, any>
  result?: {
    status: 'success' | 'failure' | 'partial'
    message?: string
    data?: any
  }
  duration?: number
}

export type Change = {
  type: string
  description: string
  intent?: string
  before?: any
  after?: any
}

export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost?: number
  model?: string
}

export type ExecutionContext = {
  triggeredBy: 'user' | 'email' | 'webhook' | 'schedule' | 'manual'
  triggerDetails?: any
  originalPrompt?: string
  conversationId?: string
}

export type FileChange = {
  path: string
  action: 'created' | 'modified' | 'deleted'
  timestamp: Date | string
  linesAdded?: number
  linesRemoved?: number
}

export type ConversationMessage = {
  id: string
  role: 'assistant' | 'user' | 'system' | 'tool'
  content: string
  timestamp: Date | string
  toolName?: string
  toolInput?: any
  toolResult?: any
  isThinking?: boolean
}

export type ActivityLog = {
  id: string
  title: string
  timestamp: Date
  actor: Actor
  type: 'system' | 'memory' | 'agent' | 'user' | 'experiment'
  changes: Change[]
  workspaceId?: string
  memoryCells?: MemoryCellChange[]
  apps?: AppUsage[]
  systemLog?: string
  memoryLog?: string
  metadata?: Record<string, any>
  workflowId?: string
  status?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'
  conversation?: ConversationMessage[]
  tokenUsage?: TokenUsage
  executionContext?: ExecutionContext
  filesModified?: FileChange[]
  platformSource?: 'discord' | 'slack' | 'email' | 'chat'
  conversationTitle?: string
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

export type ActivityLogFilter = {
  search?: string
  actors?: string[]
  actorTypes?: string[]
  types?: string[]
}

export type ListActivityLogsResponse = {
  success: boolean
  logs: ActivityLog[]
  total: number
  offset: number
  limit?: number
  hasMore: boolean
}

export type GetActivityLogResponse = {
  success: boolean
  log: ActivityLog
}
