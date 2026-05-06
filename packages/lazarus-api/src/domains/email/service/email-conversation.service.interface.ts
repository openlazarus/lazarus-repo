import type {
  EmailThreadingHeaders,
  ConversationContext,
  StoreMessageData,
  ThreadHeaders,
} from '@domains/email/types/email-conversation.types'

export interface IEmailConversationService {
  /** Find or create a conversation for an incoming email. */
  getOrCreateConversation(
    workspaceId: string,
    agentId: string,
    headers: EmailThreadingHeaders,
  ): Promise<ConversationContext>

  /** Store a message (inbound or outbound) in a conversation. */
  storeMessage(conversationId: string, data: StoreMessageData): Promise<string>

  /** Build formatted conversation history for agent prompt injection. */
  buildConversationHistory(conversationId: string, options?: { limit?: number }): Promise<string>

  /** Get RFC 2822 threading headers for composing an outbound reply. */
  getThreadHeaders(conversationId: string): Promise<ThreadHeaders>
}
