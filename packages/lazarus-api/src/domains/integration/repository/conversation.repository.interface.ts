import type { IntegrationPlatform } from '@domains/integration/types/integration.types'
import type {
  RecentConversationResult,
  NormalizedMessage,
  NormalizedConversation,
} from './conversation.repository'

export interface IConversationRepository {
  /** Find a recent conversation by channel and optional thread. */
  findRecentConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId: string | null | undefined,
    cutoffTime: Date,
  ): Promise<RecentConversationResult | null>

  /** Create a new conversation record. */
  createConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId?: string | null,
  ): Promise<{ id: string }>

  /** Update the timestamp and other fields on a conversation. */
  updateConversationTimestamp(
    platform: IntegrationPlatform,
    conversationId: string,
    updates: Record<string, any>,
  ): Promise<void>

  /** Get the message count for a conversation. */
  getConversationMessageCount(
    platform: IntegrationPlatform,
    conversationId: string,
  ): Promise<number>

  /** Atomically increment message count and update session/conversation IDs. */
  incrementAndUpdateConversation(
    platform: IntegrationPlatform,
    conversationId: string,
    sessionId: string | null | undefined,
    conversationIdValue: string | null | undefined,
  ): Promise<{ fallback: boolean; error?: any }>

  /** Insert a message record. */
  insertMessage(
    platform: IntegrationPlatform,
    conversationId: string,
    record: Record<string, any>,
  ): Promise<void>

  /** Get recent messages for a conversation. */
  getRecentMessages(
    platform: IntegrationPlatform,
    conversationId: string,
    limit: number,
  ): Promise<NormalizedMessage[]>

  /** Get conversations for a channel. */
  getChannelConversations(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    options: { limit?: number; includeThreads?: boolean },
  ): Promise<NormalizedConversation[]>
}
