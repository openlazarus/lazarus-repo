/**
 * Discord Repository
 *
 * Encapsulates all database access for Discord connections.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { Json } from '@infrastructure/database/database.types'
import type { IDiscordRepository } from './discord.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('discord')

export interface DiscordConnectionRow {
  id: string
  workspace_id: string
  guild_id: string
  guild_name: string | null
  channel_id: string | null
  agent_id: string | null
  bot_user_id: string | null
  webhook_url: string | null
  created_by: string
  settings: Json | null
  enabled: boolean | null
  created_at: string
  updated_at: string
}

export interface InsertDiscordConnectionParams {
  workspace_id: string
  guild_id: string
  guild_name?: string | null
  channel_id?: string | null
  agent_id?: string | null
  bot_user_id?: string | null
  webhook_url?: string | null
  created_by: string
  settings: Json
  enabled: boolean
  created_at: string
  updated_at: string
}

class SupabaseDiscordRepository implements IDiscordRepository {
  async insertConnection(params: InsertDiscordConnectionParams): Promise<DiscordConnectionRow> {
    const { data, error } = await supabase
      .from('discord_connections')
      .insert(params)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create Discord connection: ${error.message}`)
    }

    return data as unknown as DiscordConnectionRow
  }

  async findConnectionById(connectionId: string): Promise<DiscordConnectionRow | null> {
    const { data, error } = await supabase
      .from('discord_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      log.error({ err: error }, 'Error getting connection')
      return null
    }

    return data as unknown as DiscordConnectionRow
  }

  async findConnectionByGuild(guildId: string): Promise<DiscordConnectionRow | null> {
    // Use limit(1) + most-recent so duplicate enabled rows for the same guild
    // (e.g. left over from previous workspace bindings) don't cause `.single()`
    // to error out and silently return null.
    const { data, error } = await supabase
      .from('discord_connections')
      .select('*')
      .eq('guild_id', guildId)
      .eq('enabled', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      log.error({ err: error }, 'Error getting connection by guild')
      return null
    }

    return (data as unknown as DiscordConnectionRow) ?? null
  }

  async findConnectionsByWorkspace(workspaceId: string): Promise<DiscordConnectionRow[]> {
    const { data, error } = await supabase
      .from('discord_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ err: error }, 'Error getting connections')
      return []
    }

    return (data || []) as unknown as DiscordConnectionRow[]
  }

  async updateConnection(connectionId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('discord_connections')
      .update(updates)
      .eq('id', connectionId)

    if (error) {
      throw new Error(`Failed to update Discord connection: ${error.message}`)
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const { error } = await supabase.from('discord_connections').delete().eq('id', connectionId)

    if (error) {
      throw new Error(`Failed to delete Discord connection: ${error.message}`)
    }
  }
}

export const discordRepository: IDiscordRepository = new SupabaseDiscordRepository()
