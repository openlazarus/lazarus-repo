/**
 * Slack Repository
 *
 * Encapsulates all database access for Slack connections.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { Json } from '@infrastructure/database/database.types'
import type { ISlackRepository } from './slack.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('slack')

export interface SlackConnectionRow {
  id: string
  workspace_id: string
  slack_team_id: string
  slack_team_name: string | null
  channel_id: string | null
  agent_id: string | null
  bot_token: string
  bot_user_id: string | null
  created_by: string
  settings: Json | null
  enabled: boolean | null
  created_at: string
  updated_at: string
}

export interface InsertSlackConnectionParams {
  workspace_id: string
  slack_team_id: string
  slack_team_name?: string | null
  channel_id?: string | null
  agent_id?: string | null
  bot_token: string
  bot_user_id?: string | null
  created_by: string
  settings: Json
  enabled: boolean
  created_at: string
  updated_at: string
}

class SupabaseSlackRepository implements ISlackRepository {
  async insertConnection(params: InsertSlackConnectionParams): Promise<SlackConnectionRow> {
    const { data, error } = await supabase
      .from('slack_connections')
      .insert(params)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create Slack connection: ${error.message}`)
    }

    return data as unknown as SlackConnectionRow
  }

  async findConnectionById(connectionId: string): Promise<SlackConnectionRow | null> {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      log.error({ err: error }, 'Error getting connection')
      return null
    }

    return data as unknown as SlackConnectionRow
  }

  async findConnectionByTeam(teamId: string): Promise<SlackConnectionRow | null> {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('*')
      .eq('slack_team_id', teamId)
      .eq('enabled', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      log.error({ err: error }, 'Error getting connection by team')
      return null
    }

    return data as unknown as SlackConnectionRow
  }

  async findConnectionsByWorkspace(workspaceId: string): Promise<SlackConnectionRow[]> {
    const { data, error } = await supabase
      .from('slack_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ err: error }, 'Error getting connections')
      return []
    }

    return (data || []) as unknown as SlackConnectionRow[]
  }

  async updateConnection(connectionId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('slack_connections')
      .update(updates)
      .eq('id', connectionId)

    if (error) {
      throw new Error(`Failed to update Slack connection: ${error.message}`)
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const { error } = await supabase.from('slack_connections').delete().eq('id', connectionId)

    if (error) {
      throw new Error(`Failed to delete Slack connection: ${error.message}`)
    }
  }
}

export const slackRepository: ISlackRepository = new SupabaseSlackRepository()
