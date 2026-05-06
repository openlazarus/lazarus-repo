/**
 * Integration Diagnostics Repository
 *
 * Data access for diagnostic endpoints: connection details, conversation
 * activity, and workspace settings lookups.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { IIntegrationDiagnosticsRepository } from './integration-diagnostics.repository.interface'

export const integrationDiagnosticsRepository: IIntegrationDiagnosticsRepository = {
  async getDiscordConnectionsForWorkspace(workspaceId: string) {
    const { data, error } = await supabase
      .from('discord_connections')
      .select('id, guild_id, guild_name, enabled, created_at, updated_at')
      .eq('workspace_id', workspaceId)
    return { data, error }
  },

  async getSlackConnectionsForWorkspace(workspaceId: string) {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('id, slack_team_id, slack_team_name, enabled, created_at, updated_at')
      .eq('workspace_id', workspaceId)
    return { data, error }
  },

  async getDiscordConnectionIds(workspaceId: string) {
    const { data, error } = await supabase
      .from('discord_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
    return { data, error }
  },

  async getSlackConnectionIds(workspaceId: string) {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
    return { data, error }
  },

  async getRecentDiscordConversations(connectionIds: string[], limit: number) {
    const { data, error } = await supabase
      .from('discord_conversations')
      .select('id, channel_id, message_count, last_message_at, created_at')
      .in('discord_connection_id', connectionIds)
      .order('last_message_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getRecentSlackConversations(connectionIds: string[], limit: number) {
    const { data, error } = await supabase
      .from('slack_conversations')
      .select('id, channel_id, message_count, last_message_at, created_at')
      .in('slack_connection_id', connectionIds)
      .order('last_message_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getWorkspaceSettings(workspaceId: string) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .single()
    return { data, error }
  },
}
