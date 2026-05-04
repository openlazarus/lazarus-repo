/**
 * Smart Conversation Detection Service
 *
 * Uses time-based detection to determine whether to continue an existing
 * conversation or start a new one. Default timeout is 30 minutes.
 */

import type {
  ConversationContext,
  ConversationDetectorConfig,
  IntegrationPlatform,
} from '@domains/integration/types/integration.types'
import { conversationRepository } from '@domains/integration/repository/conversation.repository'

export type { ConversationContext, ConversationDetectorConfig, IntegrationPlatform }

import type { IConversationDetector } from './conversation-detector.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('conversation-detector')

// Default conversation timeout in minutes
const DEFAULT_CONVERSATION_TIMEOUT_MINUTES = 30

export class ConversationDetector implements IConversationDetector {
  private timeoutMinutes: number

  constructor(config: ConversationDetectorConfig = {}) {
    this.timeoutMinutes = config.timeoutMinutes ?? DEFAULT_CONVERSATION_TIMEOUT_MINUTES
  }

  /**
   * Get or create a conversation context for an incoming message.
   * Uses time-based detection: if more than `timeoutMinutes` have passed
   * since the last message, a new conversation is created.
   */
  async getOrCreateConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId?: string | null,
  ): Promise<ConversationContext> {
    // 1. Look for recent conversation in this channel/thread
    const recentConversation = await this.findRecentConversation(
      platform,
      connectionId,
      channelId,
      threadId,
    )

    if (recentConversation) {
      // Continue existing conversation
      return {
        id: recentConversation.id,
        connectionId,
        channelId,
        threadId: recentConversation.threadId,
        sessionId: recentConversation.sessionId,
        conversationId: recentConversation.conversationId,
        isNewConversation: false,
        messageCount: recentConversation.messageCount,
        lastMessageAt: recentConversation.lastMessageAt,
      }
    }

    // 2. Create new conversation (time gap exceeded or no prior conversation)
    const newConversation = await this.createConversation(
      platform,
      connectionId,
      channelId,
      threadId,
    )

    return {
      id: newConversation.id,
      connectionId,
      channelId,
      threadId,
      sessionId: null, // New session will be created by agent executor
      conversationId: null,
      isNewConversation: true,
      messageCount: 0,
      lastMessageAt: new Date(),
    }
  }

  /**
   * Find a recent conversation within the timeout window
   */
  private async findRecentConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId?: string | null,
  ): Promise<{
    id: string
    threadId: string | null
    sessionId: string | null
    conversationId: string | null
    messageCount: number
    lastMessageAt: Date
  } | null> {
    const cutoffTime = new Date(Date.now() - this.timeoutMinutes * 60 * 1000)
    return conversationRepository.findRecentConversation(
      platform,
      connectionId,
      channelId,
      threadId,
      cutoffTime,
    )
  }

  /**
   * Create a new conversation record
   */
  private async createConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId?: string | null,
  ): Promise<{ id: string }> {
    return conversationRepository.createConversation(platform, connectionId, channelId, threadId)
  }

  /**
   * Update conversation with session ID and increment message count
   */
  async updateConversation(
    platform: IntegrationPlatform,
    conversationId: string,
    updates: {
      sessionId?: string
      conversationId?: string
      incrementMessageCount?: boolean
    },
  ): Promise<void> {
    const updateData: Record<string, any> = {
      last_message_at: new Date().toISOString(),
    }

    if (updates.sessionId) {
      updateData.session_id = updates.sessionId
    }

    if (updates.conversationId) {
      updateData.conversation_id = updates.conversationId
    }

    try {
      if (updates.incrementMessageCount) {
        const rpcResult = await conversationRepository.incrementAndUpdateConversation(
          platform,
          conversationId,
          updates.sessionId,
          updates.conversationId,
        )

        if (rpcResult.fallback) {
          const currentCount = await conversationRepository.getConversationMessageCount(
            platform,
            conversationId,
          )
          updateData.message_count = currentCount + 1
          await conversationRepository.updateConversationTimestamp(
            platform,
            conversationId,
            updateData,
          )
        }
      } else {
        await conversationRepository.updateConversationTimestamp(
          platform,
          conversationId,
          updateData,
        )
      }
    } catch (error) {
      log.error({ err: error }, `Error updating conversation:`)
    }
  }

  /**
   * Store a message in the history log
   */
  async storeMessage(
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
  ): Promise<void> {
    const messageIdField = platform === 'discord' ? 'discord_message_id' : 'slack_ts'
    const authorIdField = platform === 'discord' ? 'author_id' : 'user_id'
    const authorNameField = platform === 'discord' ? 'author_name' : 'user_name'

    const record: Record<string, any> = {
      [messageIdField]: message.platformMessageId,
      [authorIdField]: message.authorId,
      [authorNameField]: message.authorName || null,
      content: message.content,
      is_from_bot: message.isFromBot,
      attachments: message.attachments ? JSON.stringify(message.attachments) : '[]',
    }

    try {
      await conversationRepository.insertMessage(platform, conversationId, record)
    } catch (error) {
      log.error({ err: error }, `Error storing message:`)
    }
  }

  /**
   * Get recent messages for a conversation
   */
  async getRecentMessages(
    platform: IntegrationPlatform,
    conversationId: string,
    limit: number = 50,
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
  > {
    return conversationRepository.getRecentMessages(platform, conversationId, limit)
  }

  /**
   * Get conversations for a channel
   */
  async getChannelConversations(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    options: {
      limit?: number
      includeThreads?: boolean
    } = {},
  ): Promise<
    Array<{
      id: string
      threadId: string | null
      sessionId: string | null
      messageCount: number
      createdAt: Date
      lastMessageAt: Date
    }>
  > {
    return conversationRepository.getChannelConversations(
      platform,
      connectionId,
      channelId,
      options,
    )
  }
  /**
   * Build a formatted conversation history string for agent context.
   * Returns empty string if no history or on error.
   */
  async buildConversationHistory(
    platform: IntegrationPlatform,
    conversationId: string,
    options: { limit?: number } = {},
  ): Promise<string> {
    const limit = options.limit ?? 20

    try {
      const recentMessages = await this.getRecentMessages(platform, conversationId, limit)

      if (recentMessages.length === 0) {
        return ''
      }

      // Messages come in reverse chronological order, flip to chronological
      const chronological = recentMessages.reverse()
      const history = chronological
        .map((msg) => {
          const role = msg.isFromBot ? 'Lazarus' : msg.authorName || msg.authorId
          return `${role}: ${msg.content}`
        })
        .join('\n')

      return `[Conversation history]\n${history}\n[End of conversation history]\n\n`
    } catch (error) {
      log.error({ err: error }, `Error building conversation history:`)
      return ''
    }
  }
}

// Export singleton instance with default config
export const conversationDetector: IConversationDetector = new ConversationDetector()
