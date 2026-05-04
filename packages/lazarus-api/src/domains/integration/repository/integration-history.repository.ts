/**
 * Integration History Repository
 *
 * Data access for Discord/Slack connection lookups, message queries with
 * conversation joins, conversation listings, and message search.
 * Used by integration-history-tools and integration-channel-tools.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { IIntegrationHistoryRepository } from './integration-history.repository.interface'

export const integrationHistoryRepository: IIntegrationHistoryRepository = {
  async getEnabledDiscordConnections(workspaceId: string) {
    const { data, error } = await supabase
      .from('discord_connections')
      .select('id, guild_name')
      .eq('workspace_id', workspaceId)
      .eq('enabled', true)
    return { data, error }
  },

  async getEnabledSlackConnections(workspaceId: string) {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('id, slack_team_name')
      .eq('workspace_id', workspaceId)
      .eq('enabled', true)
    return { data, error }
  },

  async getDiscordMessagesWithConversation(
    connectionIds: string[],
    options: { channelId?: string; includeBotMessages?: boolean; limit: number },
  ) {
    let query = supabase
      .from('discord_messages')
      .select(
        `
        id,
        discord_message_id,
        author_id,
        author_name,
        content,
        is_from_bot,
        attachments,
        created_at,
        discord_conversations!inner(
          channel_id,
          thread_id,
          discord_connection_id
        )
      `,
      )
      .in('discord_conversations.discord_connection_id', connectionIds)
      .order('created_at', { ascending: false })
      .limit(options.limit)

    if (options.channelId) {
      query = query.eq('discord_conversations.channel_id', options.channelId)
    }
    if (options.includeBotMessages === false) {
      query = query.eq('is_from_bot', false)
    }

    const { data, error } = await query
    return { data, error }
  },

  async getSlackMessagesWithConversation(
    connectionIds: string[],
    options: { channelId?: string; includeBotMessages?: boolean; limit: number },
  ) {
    let query = supabase
      .from('slack_messages')
      .select(
        `
        id,
        slack_ts,
        user_id,
        user_name,
        content,
        is_from_bot,
        attachments,
        created_at,
        slack_conversations!inner(
          channel_id,
          thread_ts,
          slack_connection_id
        )
      `,
      )
      .in('slack_conversations.slack_connection_id', connectionIds)
      .order('created_at', { ascending: false })
      .limit(options.limit)

    if (options.channelId) {
      query = query.eq('slack_conversations.channel_id', options.channelId)
    }
    if (options.includeBotMessages === false) {
      query = query.eq('is_from_bot', false)
    }

    const { data, error } = await query
    return { data, error }
  },

  async getRecentDiscordConversations(connectionIds: string[], cutoff: string, limit: number) {
    const { data, error } = await supabase
      .from('discord_conversations')
      .select('id, channel_id, thread_id, message_count, created_at, last_message_at')
      .in('discord_connection_id', connectionIds)
      .gte('last_message_at', cutoff)
      .order('last_message_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getRecentSlackConversations(connectionIds: string[], cutoff: string, limit: number) {
    const { data, error } = await supabase
      .from('slack_conversations')
      .select('id, channel_id, thread_ts, message_count, created_at, last_message_at')
      .in('slack_connection_id', connectionIds)
      .gte('last_message_at', cutoff)
      .order('last_message_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async searchDiscordMessages(connectionIds: string[], searchPattern: string, limit: number) {
    const { data, error } = await supabase
      .from('discord_messages')
      .select(
        `
        content,
        author_name,
        created_at,
        is_from_bot,
        discord_conversations!inner(
          channel_id,
          discord_connection_id
        )
      `,
      )
      .in('discord_conversations.discord_connection_id', connectionIds)
      .ilike('content', searchPattern)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async searchSlackMessages(connectionIds: string[], searchPattern: string, limit: number) {
    const { data, error } = await supabase
      .from('slack_messages')
      .select(
        `
        content,
        user_name,
        created_at,
        is_from_bot,
        slack_conversations!inner(
          channel_id,
          slack_connection_id
        )
      `,
      )
      .in('slack_conversations.slack_connection_id', connectionIds)
      .ilike('content', searchPattern)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getSlackConnectionBotToken(workspaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('bot_token')
      .eq('workspace_id', workspaceId)
      .eq('enabled', true)
      .single()

    if (error || !data) return null
    return (data as any).bot_token || null
  },
}
