import { BaseItem } from './item'

/**
 * Conversation metadata returned by workspace VM `/api/conversations` endpoints.
 * Use the atomic hooks under `hooks/features/conversation/*` to fetch/mutate.
 */
export interface ConversationMetadata {
  id: string
  sessionId: string
  workspaceId: string
  userId?: string
  teamId?: string
  title: string
  createdAt: string
  lastActivity: string
  messageCount: number
  labels?: string[]
  notes?: string
  agentId?: string | null
  agentName?: string
}

/**
 * Legacy conversation model for Supabase-based system
 * NOTE: For new features, use the file-based conversation system with the
 * atomic hooks under `hooks/features/conversation/*`.
 */
export interface Conversation extends BaseItem {
  type: 'conversation'
  title: string
  description?: string
  status?: 'active' | 'archived'
  lastActivity?: string
}

/**
 * Factory function to create a new conversation with defaults
 */
export function createConversation(
  partial: Partial<Conversation> = {},
): Conversation {
  const now = new Date().toISOString()

  return {
    id:
      partial.id ||
      `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: 'conversation',
    name: partial.name || partial.title || 'New Conversation',
    workspaceId: partial.workspaceId || '',
    title: partial.title || 'New Conversation',
    description: partial.description,
    status: partial.status || 'active',
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    lastActivity: partial.lastActivity || now,
    metadata: partial.metadata || {},
  }
}

/**
 * Get human-readable display name for conversation type
 */
export function getConversationDisplayName(): string {
  return 'Conversation'
}
