import type {
  ConversationRow,
  ConversationInsert,
  MessageInsert,
  MessageRow,
} from '@domains/email/types/email-conversation.types'

// ---------------------------------------------------------------------------
// Repository interface — contract for all persistence operations
// ---------------------------------------------------------------------------

export interface IEmailConversationRepository {
  /** Find a conversation by matching an email_message_id in the messages table. */
  findConversationByMessageId(
    workspaceId: string,
    agentId: string,
    emailMessageId: string,
  ): Promise<ConversationRow | null>

  /** Find a conversation by normalized subject + sender within a time window. */
  findConversationBySubjectSender(
    workspaceId: string,
    agentId: string,
    normalizedSubject: string,
    senderEmail: string,
    since: string,
  ): Promise<ConversationRow | null>

  /** Create a new conversation and return its id. */
  createConversation(row: ConversationInsert): Promise<string>

  /** Insert a message and return its id. */
  insertMessage(row: MessageInsert): Promise<string>

  /** Increment message_count and bump last_message_at. */
  incrementMessageCount(conversationId: string): Promise<void>

  /** Fetch messages for a conversation ordered by created_at ASC. */
  getMessages(conversationId: string, limit: number): Promise<MessageRow[]>

  /** Get all email_message_ids for a conversation (newest first). */
  getMessageIds(conversationId: string): Promise<string[]>

  /** Get thread_root_message_id for a conversation. */
  getThreadRoot(conversationId: string): Promise<string | null>
}
