/**
 * Conversation Repository
 *
 * Encapsulates all database access for Discord/Slack conversations and messages.
 * Handles platform-parameterized queries against conversation and message tables.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { IntegrationPlatform } from '@domains/integration/types/integration.types'
import type { IConversationRepository } from './conversation.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('conversation')

/** Row shape for dynamic conversation lookups (dynamic select column `thread_id` | `thread_ts`). */
type ConversationLookupRow = {
  id: string
  session_id: string | null
  conversation_id: string | null
  message_count: number | null
  last_message_at: string
  thread_id?: string | null
  thread_ts?: string | null
}

export interface RecentConversationResult {
  id: string
  threadId: string | null
  sessionId: string | null
  conversationId: string | null
  messageCount: number
  lastMessageAt: Date
}

export interface NormalizedMessage {
  id: string
  platformMessageId: string
  authorId: string
  authorName: string | null
  content: string
  isFromBot: boolean
  attachments: any[]
  createdAt: Date
}

export interface NormalizedConversation {
  id: string
  threadId: string | null
  sessionId: string | null
  messageCount: number
  createdAt: Date
  lastMessageAt: Date
}

function platformConfig(platform: IntegrationPlatform) {
  if (platform === 'discord') {
    return {
      conversationTable: 'discord_conversations' as const,
      messageTable: 'discord_messages' as const,
      connectionField: 'discord_connection_id',
      threadField: 'thread_id',
      conversationField: 'discord_conversation_id',
      messageIdField: 'discord_message_id',
      authorIdField: 'author_id',
      authorNameField: 'author_name',
    }
  }
  return {
    conversationTable: 'slack_conversations' as const,
    messageTable: 'slack_messages' as const,
    connectionField: 'slack_connection_id',
    threadField: 'thread_ts',
    conversationField: 'slack_conversation_id',
    messageIdField: 'slack_ts',
    authorIdField: 'user_id',
    authorNameField: 'user_name',
  }
}

class SupabaseConversationRepository implements IConversationRepository {
  async findRecentConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId: string | null | undefined,
    cutoffTime: Date,
  ): Promise<RecentConversationResult | null> {
    const cfg = platformConfig(platform)

    try {
      let query = supabase
        .from(cfg.conversationTable)
        .select(
          'id, session_id, conversation_id, message_count, last_message_at, ' + cfg.threadField,
        )
        .eq(cfg.connectionField, connectionId)
        .eq('channel_id', channelId)
        .gte('last_message_at', cutoffTime.toISOString())
        .order('last_message_at', { ascending: false })
        .limit(1)

      if (threadId) {
        query = query.eq(cfg.threadField, threadId)
      } else {
        query = query.is(cfg.threadField, null)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code !== 'PGRST116') {
          log.error({ err: error }, `Error finding recent conversation:`)
        }
        return null
      }

      const row = data as unknown as ConversationLookupRow
      return {
        id: row.id,
        threadId:
          (row[cfg.threadField as keyof ConversationLookupRow] as string | null | undefined) ||
          null,
        sessionId: row.session_id,
        conversationId: row.conversation_id,
        messageCount: row.message_count || 0,
        lastMessageAt: new Date(row.last_message_at),
      }
    } catch (error) {
      log.error({ err: error }, `Error finding recent conversation:`)
      return null
    }
  }

  async createConversation(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    threadId?: string | null,
  ): Promise<{ id: string }> {
    const cfg = platformConfig(platform)
    const now = new Date().toISOString()
    const record: Record<string, any> = {
      [cfg.connectionField]: connectionId,
      channel_id: channelId,
      last_message_at: now,
      message_count: 0,
    }

    if (threadId) {
      record[cfg.threadField] = threadId
    }

    const { data, error } = await (supabase as any)
      .from(cfg.conversationTable)
      .insert(record)
      .select('id')
      .single()

    if (error) {
      log.error({ err: error }, `Error creating conversation:`)
      throw error
    }

    return { id: (data as { id: string }).id }
  }

  async updateConversationTimestamp(
    platform: IntegrationPlatform,
    conversationId: string,
    updates: Record<string, any>,
  ): Promise<void> {
    const cfg = platformConfig(platform)
    await supabase.from(cfg.conversationTable).update(updates).eq('id', conversationId)
  }

  async getConversationMessageCount(
    platform: IntegrationPlatform,
    conversationId: string,
  ): Promise<number> {
    const cfg = platformConfig(platform)
    const { data } = await supabase
      .from(cfg.conversationTable)
      .select('message_count')
      .eq('id', conversationId)
      .single()

    return data?.message_count || 0
  }

  async incrementAndUpdateConversation(
    platform: IntegrationPlatform,
    conversationId: string,
    sessionId: string | null | undefined,
    conversationIdValue: string | null | undefined,
  ): Promise<{ fallback: boolean; error?: any }> {
    const cfg = platformConfig(platform)

    const { error } = await (supabase.rpc as any)('increment_conversation_message_count', {
      table_name: cfg.conversationTable,
      conversation_id: conversationId,
      session_id_value: sessionId || null,
      conversation_id_value: conversationIdValue || null,
    })

    if (error) {
      return { fallback: true, error }
    }
    return { fallback: false }
  }

  async insertMessage(
    platform: IntegrationPlatform,
    conversationId: string,
    record: Record<string, any>,
  ): Promise<void> {
    const cfg = platformConfig(platform)
    const fullRecord = {
      ...record,
      [cfg.conversationField]: conversationId,
    }

    const { error } = await (supabase as any).from(cfg.messageTable).insert(fullRecord)

    if (error) {
      if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
        log.error({ err: error }, `Error storing message:`)
      }
    }
  }

  async getRecentMessages(
    platform: IntegrationPlatform,
    conversationId: string,
    limit: number,
  ): Promise<NormalizedMessage[]> {
    const cfg = platformConfig(platform)

    try {
      const { data, error } = await supabase
        .from(cfg.messageTable)
        .select('*')
        .eq(cfg.conversationField, conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        log.error({ err: error }, `Error fetching messages:`)
        return []
      }

      return (data || []).map((msg: any) => ({
        id: msg.id,
        platformMessageId: msg[cfg.messageIdField],
        authorId: msg[cfg.authorIdField],
        authorName: msg[cfg.authorNameField],
        content: msg.content ?? '',
        isFromBot: msg.is_from_bot ?? false,
        attachments:
          typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments || [],
        createdAt: new Date(msg.created_at),
      }))
    } catch (error) {
      log.error({ err: error }, `Error fetching messages:`)
      return []
    }
  }

  async getChannelConversations(
    platform: IntegrationPlatform,
    connectionId: string,
    channelId: string,
    options: { limit?: number; includeThreads?: boolean } = {},
  ): Promise<NormalizedConversation[]> {
    const cfg = platformConfig(platform)

    try {
      let query = supabase
        .from(cfg.conversationTable)
        .select('id, session_id, message_count, created_at, last_message_at, ' + cfg.threadField)
        .eq(cfg.connectionField, connectionId)
        .eq('channel_id', channelId)
        .order('last_message_at', { ascending: false })
        .limit(options.limit || 50)

      if (!options.includeThreads) {
        query = query.is(cfg.threadField, null)
      }

      const { data, error } = await query

      if (error) {
        log.error({ err: error }, `Error fetching conversations:`)
        return []
      }

      return (data || []).map((conv: any) => ({
        id: conv.id,
        threadId: conv[cfg.threadField] || null,
        sessionId: conv.session_id,
        messageCount: conv.message_count || 0,
        createdAt: new Date(conv.created_at),
        lastMessageAt: new Date(conv.last_message_at),
      }))
    } catch (error) {
      log.error({ err: error }, `Error fetching conversations:`)
      return []
    }
  }
}

export const conversationRepository: IConversationRepository = new SupabaseConversationRepository()
