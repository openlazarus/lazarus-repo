/**
 * Agent Repository
 *
 * Encapsulates all database access for agent-related operations,
 * including workspace lookups used by the agent-lookup service
 * and team membership queries used by the agent manager.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { IAgentRepository } from './agent.repository.interface'
import { createLogger } from '@utils/logger'

const log = createLogger('agent-repository')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceLookupRow {
  id: string
  slug: string | null
  user_id: string
  settings: { path?: string } | null
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class AgentRepository implements IAgentRepository {
  async getWorkspaceLookupById(workspaceId: string): Promise<WorkspaceLookupRow | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, slug, user_id, settings')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      log.error({ err: error, workspaceId }, 'Error getting workspace by id')
      return null
    }

    if (!data) return null

    return {
      ...data,
      settings: data.settings as { path?: string } | null,
    }
  }

  async getWorkspaceLookupBySlug(slug: string): Promise<WorkspaceLookupRow | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, slug, user_id, settings')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      log.error({ err: error, slug }, 'Error getting workspace by slug')
      return null
    }

    if (!data) return null

    return {
      ...data,
      settings: data.settings as { path?: string } | null,
    }
  }

  async getUserPersonalTeamId(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces!inner(is_default)')
      .eq('user_id', userId)
      .eq('workspaces.is_default', true)
      .maybeSingle()

    if (error || !data) {
      const { data: fallback } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      return fallback?.workspace_id ?? null
    }

    return data.workspace_id
  }
}

export const agentRepository: IAgentRepository = new AgentRepository()
