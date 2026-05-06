import { z } from 'zod'
import { MAX_TURNS } from '@infrastructure/config/max-turns'

// Search schemas
export const SearchRequestSchema = z.object({
  query: z.string(),
  channel: z.string().optional(),
  author: z.string().optional(),
  daysBack: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).default(50),
})

export type SearchRequest = z.infer<typeof SearchRequestSchema>

export interface SearchResponse {
  results: MessageDTO[]
  count: number
}

// Message types
export interface MessageDTO {
  id: number
  discordId: string
  content: string | null
  author: string | null
  authorId: string | null
  channel: string | null
  guild: string | null
  timestamp: string
  metadata: Record<string, any>
}

// Analytics types
export interface Statistics {
  totalMessages: number
  uniqueAuthors: number
  channels: number
  messagesWithAttachments: number
}

export interface CommunicationPatterns {
  totalMessages: number
  uniqueAuthors: number
  messagesByChannel: Record<string, number>
  messagesByAuthor: Record<string, number>
  activityByHour: Record<number, number>
  mostActiveTimes: string[]
}

export interface AnalysisResponse {
  analysis: any
  generatedAt: Date
}

export interface RecentAnalysis {
  periodHours: number
  messageCount: number
  channelsAnalyzed: string[]
  analysis: string
}

// Claude Code SDK types
export const ClaudeCodeOptionsSchema = z.object({
  maxTurns: z.number().int().positive().default(MAX_TURNS.executor),
  systemPrompt: z.string().optional(),
  cwd: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  permissionMode: z.enum(['acceptEdits', 'confirmEdits', 'rejectEdits']).default('acceptEdits'),
  useMcp: z.boolean().default(true),
  // Session management
  resume: z.string().optional(), // Resume from existing session ID
  model: z.string().optional(), // Model to use
})

export type ClaudeCodeOptions = z.infer<typeof ClaudeCodeOptionsSchema>

export const ClaudeCodeRequestSchema = z.object({
  prompt: z.string(),
  options: ClaudeCodeOptionsSchema.optional(),
  workspaceId: z.string().optional(),
  userId: z.string().optional(),
  teamId: z.string().optional(),
  sessionId: z.string().optional(), // Use existing session or create new one
  saveSession: z.boolean().default(true), // Whether to save the session
})

export type ClaudeCodeRequest = z.infer<typeof ClaudeCodeRequestSchema>

// SSE message types
export interface SSEMessage {
  type: 'assistant' | 'user' | 'system' | 'result' | 'tool_use' | 'tool_result' | 'unknown'
  content: string
  timestamp: string
  tool?: {
    name: string
    parameters: Record<string, any>
  }
}

// MCP Configuration types
export type MCPAuthType = 'none' | 'api_key' | 'oauth' | 'oauth_pkce'

export interface MCPOAuthConfig {
  // OAuth server endpoints (discovered or configured)
  authorizationEndpoint?: string
  tokenEndpoint?: string
  registrationEndpoint?: string
  // OAuth client configuration
  clientId?: string
  clientSecret?: string
  scopes?: string[]
  // Remote MCP server URL for OAuth-enabled servers
  remoteUrl?: string
  // Names of env vars in the server config that hold a user-registered OAuth
  // client's credentials. When present, DCR is skipped and these credentials
  // are used directly. Used when the provider's OAuth server rejects DCR
  // callback hosts (e.g. Canva).
  clientIdEnvVar?: string
  clientSecretEnvVar?: string
}

export interface MCPOAuthState {
  // Current authorization status
  status: 'not_required' | 'pending' | 'authorized' | 'expired' | 'error'
  // Authorization URL for user to click
  authorizationUrl?: string
  // Error message if authorization failed
  error?: string
  // When the token expires
  expiresAt?: string
  // Last authorized timestamp
  authorizedAt?: string
}

export interface MCPServerConfig {
  // For stdio-based servers
  command?: string
  args?: string[]
  // For HTTP/SSE-based servers
  url?: string
  headers?: Record<string, string>
  // Common fields
  env?: Record<string, string>
  enabled?: boolean
  description?: string
  icon?: string
  category?: string
  transport?: 'stdio' | 'http' | 'sse' | 'websocket'
  // OAuth configuration
  authType?: MCPAuthType
  oauth?: MCPOAuthConfig
  // Runtime OAuth state (not persisted in config, populated dynamically)
  oauthState?: MCPOAuthState
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>
}
