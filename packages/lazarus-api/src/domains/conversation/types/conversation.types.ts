/**
 * Shared types for conversation, session, and context-building services.
 */

/** Transcript line for conversation summarization (speaker-labeled). */
export interface ConversationMessage {
  speaker: string
  content: string
  timestamp: string
}

/**
 * Global agent WhatsApp history.json entries (role-based, optional tool round data).
 * Distinct from {@link ConversationMessage} used for summarization.
 */
export interface GlobalAgentConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolCalls?: Array<{ name: string; input: any; result: string }>
}

export interface ConversationMetadata {
  id: string
  sessionId: string
  workspaceId: string
  userId?: string
  agentId?: string | null // Agent ID (null = default Lazarus agent)
  agentName?: string // Agent display name
  title: string
  createdAt: string
  lastActivity: string
  messageCount: number
  labels?: string[]
  notes?: string
  librarian?: {
    analyzed: boolean
    analyzedAt?: string
    artifactsCreated?: string[]
    artifactsUpdated?: string[]
  }
}

export interface ConversationsIndex {
  [conversationId: string]: ConversationMetadata
}

export interface ParsedMention {
  type: string
  id: string
  displayName?: string
  fullMatch: string
  startIndex: number
  endIndex: number
}

export interface MentionReference {
  type: string
  id: string
}

export interface ContextItem {
  type: 'file' | 'conversation' | 'text'
  source: string // file path, conversation ID, or label
  content: string
  metadata?: Record<string, any>
}

export interface ContextBuildResult {
  items: ContextItem[]
  errors: Array<{ type: string; id: string; error: string }>
}

export interface SessionMetadata {
  id: string
  workspaceId?: string
  userId?: string
  projectPath?: string
  status: 'active' | 'completed' | 'interrupted'
  model?: string
  createdAt: string
  updatedAt: string
  lastPrompt?: string
  messageCount: number
  tools?: string[]
  mcpServers?: Record<string, any>
}

export interface SessionMessage {
  type: 'user' | 'assistant' | 'checkpoint' | 'tool_use' | 'tool_result' | 'system'
  content?: any
  timestamp: string
  metadata?: Record<string, any>
}
