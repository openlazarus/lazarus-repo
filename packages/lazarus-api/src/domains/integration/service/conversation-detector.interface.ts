import type {
  ConversationContext,
  IntegrationPlatform,
} from '@domains/integration/types/integration.types'

export interface IConversationDetector {
  /** Get or create a conversation context for an incoming message. */
  getOrCreateConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId?: string | null,
  ): Promise<ConversationContext>

  /** Update conversation with session ID and increment message count. */
  updateConversation(
    platform: IntegrationPlatform,
    conversationId: string,
    updates: {
      sessionId?: string
      conversationId?: string
      incrementMessageCount?: boolean
    },
  ): Promise<void>

  /** Store a message in the history log. */
  storeMessage(
    platform: IntegrationPlatform,
    conversationId: string,
    message: {
      platformMessageId: string
      authorId: string
      authorName?: string
      content: string
      isFromBot: boolean
      attachments?: Array<{
        filename: string
        url: string
        contentType: string
        size: number
        storagePath?: string
      }>
    },
  ): Promise<void>

  /** Get recent messages for a conversation. */
  getRecentMessages(
    platform: IntegrationPlatform,
    conversationId: string,
    limit?: number,
  ): Promise<
    Array<{
      id: string
      platformMessageId: string
      authorId: string
      authorName: string | null
      content: string
      isFromBot: boolean
      attachments: any[]
      createdAt: Date
    }>
  >

  /** Get conversations for a channel. */
  getChannelConversations(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    options?: {
      limit?: number
      includeThreads?: boolean
    },
  ): Promise<
    Array<{
      id: string
      threadId: string | null
      sessionId: string | null
      messageCount: number
      createdAt: Date
      lastMessageAt: Date
    }>
  >

  /** Build a formatted conversation history string for agent context. */
  buildConversationHistory(
    platform: IntegrationPlatform,
    conversationId: string,
    options?: { limit?: number },
  ): Promise<string>
}
