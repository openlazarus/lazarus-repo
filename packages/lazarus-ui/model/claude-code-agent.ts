export interface ClaudeModelConfig {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stopSequences?: string[]
}

export interface ClaudeCodeTool {
  name: string
  description: string
  inputSchema?: Record<string, any>
  handler?: (input: any) => Promise<any>
}

export interface AgentToolMetadata {
  name: string
  description: string
  category: 'database' | 'ui' | 'general'
}

export interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
  cwd?: string
}

export interface ClaudeCodeAgent {
  id: string
  name: string
  description: string
  systemPrompt: string
  allowedTools: string[]
  customTools?: ClaudeCodeTool[]
  tools?: AgentToolMetadata[] // Tool metadata from backend (for display)
  modelConfig: ClaudeModelConfig
  workspaceId: string // Required workspace assignment
  mcpServers?: Record<string, MCPServerConfig>
  activeMCPs?: string[] // Subset of workspace MCPs
  emailAddress?: string // Auto-generated: {agentId}@lazarusconnect.com
  emailProjectId?: string // Email-service project ID
  triggers?: string[] // Trigger IDs linked to this agent
  guardrails?: Array<{
    categoryId: string
    level: 'always_allowed' | 'ask_first' | 'never_allowed'
    conditions?: string
  }>
  metadata: {
    created: string
    updated: string
    author: string
    tags: string[]
    scope: 'user' | 'team' | 'global'
    isSystemAgent?: boolean
  }
  // Permission channel: send permission requests via communication channels
  // when background agents encounter ask_first guardrails
  permissionChannel?: {
    enabled: boolean
    platform: 'whatsapp' | 'discord' | 'email' | 'slack'
    phoneNumberId?: string
    targetPhone?: string
    channelId?: string
    targetUserId?: string
    slackChannelId?: string
    slackUserId?: string
    targetEmail?: string
    timeoutMinutes?: number
  }
  // Agent type (Lazarus internal or External)
  agentType?: 'lazarus' | 'external'
  // Email for the agent (legacy - use emailAddress instead)
  email?: string
  // Restrict external emails to workspace members only (default: true)
  restrictEmailToMembers?: boolean
  // Allowed external email addresses/patterns when restriction is enabled
  allowedExternalEmails?: string[]
  // API endpoint for triggering the agent
  apiEndpoint?: string
  // MCP connection instructions
  mcpInstructions?: string
  // Legacy fields for backward compatibility
  scope?: 'user' | 'team' | 'global'
  userId?: string
  teamId?: string
  createdAt?: Date
  updatedAt?: Date
  tags?: string[]
  version?: string
  isSystemAgent?: boolean
  isActive?: boolean
}

export interface AgentExecutionRequest {
  agentId: string
  task: string
  workspaceId: string
  userId: string
  teamId?: string
  context?: Record<string, any>
  stream?: boolean
}

export interface AgentExecutionResponse {
  sessionId: string
  agentId: string
  result?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  duration?: number
  artifacts?: Array<{
    type: string
    content: any
  }>
}

export interface AgentSession {
  id: string
  agentId: string
  userId: string
  workspaceId: string
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  task: string
  result?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export interface WorkspaceContext {
  id: string
  name: string
  path: string
  description?: string
  environment?: Record<string, string>
  files?: string[]
  mcpServers?: Record<string, MCPServerConfig>
}

export interface EffectiveAgentConfig {
  agent: ClaudeCodeAgent
  workspace?: WorkspaceContext
  effectiveSystemPrompt: string
  effectiveTools: string[]
  effectiveMCPServers: Record<string, MCPServerConfig>
}
