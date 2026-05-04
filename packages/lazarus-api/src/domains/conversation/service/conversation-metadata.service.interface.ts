import type { ConversationMetadata } from '@domains/conversation/types/conversation.types'

export interface IConversationMetadataService {
  /** Link a Claude SDK session to a conversation. */
  linkSessionToConversation(params: {
    sessionId: string
    workspaceId: string
    userId?: string
    agentId?: string | null
    agentName?: string
    title?: string
    messageCount?: number
  }): Promise<string>

  /** List all conversations for a workspace. */
  listConversations(workspaceId: string, userId?: string): Promise<ConversationMetadata[]>

  /** Get a single conversation by ID. */
  getConversation(
    conversationId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<ConversationMetadata | null>

  /** Update conversation metadata. */
  updateConversation(
    conversationId: string,
    updates: Partial<ConversationMetadata>,
    userId?: string,
    workspaceId?: string,
  ): Promise<void>

  /** Update a conversation's SDK session_id (used when SDK rotates on resume). */
  updateSessionId(
    conversationId: string,
    newSessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<void>

  /** Delete a conversation (metadata only). */
  deleteConversation(conversationId: string, userId?: string, workspaceId?: string): Promise<void>

  /** Find conversation by session ID. */
  findBySessionId(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<ConversationMetadata | null>

  /** Increment message count for a conversation by session ID. */
  incrementMessageCount(sessionId: string, workspaceId: string, userId?: string): Promise<void>

  /** Get unanalyzed conversations for librarian processing. */
  getUnanalyzedConversations(
    workspaceId: string,
    userId?: string,
    minMessageCount?: number,
  ): Promise<ConversationMetadata[]>

  /** Mark conversation as analyzed by librarian. */
  markAsAnalyzed(
    conversationId: string,
    artifactsCreated: string[],
    artifactsUpdated: string[],
    userId?: string,
    workspaceId?: string,
  ): Promise<void>
}
