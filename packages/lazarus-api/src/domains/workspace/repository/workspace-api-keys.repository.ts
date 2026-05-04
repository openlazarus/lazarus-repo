/**
 * Workspace API Keys Repository
 *
 * Encapsulates all database access for workspace API keys.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { Json } from '@infrastructure/database/database.types'
import type { IApiKeysRepository } from './workspace-api-keys.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-api-keys')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyRow {
  id: string
  workspace_id: string
  key_hash: string
  key_prefix: string
  name: string
  permissions: Json
  rate_limit: number
  created_at: string
  updated_at: string
  created_by: string
  last_used_at: string | null
  expires_at: string | null
}

export interface InsertApiKeyParams {
  workspace_id: string
  key_hash: string
  key_prefix: string
  name: string
  permissions: Record<string, any>
  rate_limit: number
  expires_at: string | null
  created_by: string
}

export interface ValidateApiKeyResult {
  id: string
  workspace_id: string
  is_valid: boolean
  permissions: Json
  rate_limit: number
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class ApiKeysRepository implements IApiKeysRepository {
  async insertApiKey(params: InsertApiKeyParams): Promise<ApiKeyRow> {
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        workspace_id: params.workspace_id,
        key_hash: params.key_hash,
        key_prefix: params.key_prefix,
        name: params.name,
        permissions: params.permissions as unknown as Json,
        rate_limit: params.rate_limit,
        expires_at: params.expires_at,
        created_by: params.created_by,
      })
      .select()
      .single()

    if (error) {
      log.error({ err: error }, 'Error inserting API key')
      throw error
    }

    return data as unknown as ApiKeyRow
  }

  async validateApiKeyRpc(keyHash: string): Promise<ValidateApiKeyResult[]> {
    const { data, error } = await supabase.rpc('validate_api_key', {
      key_hash_param: keyHash,
    })

    if (error) {
      log.error({ err: error }, 'Error validating API key')
      throw error
    }

    return (data ?? []) as ValidateApiKeyResult[]
  }

  async updateApiKeyUsageRpc(keyHash: string): Promise<void> {
    const { error } = await supabase.rpc('update_api_key_usage', {
      key_hash_param: keyHash,
    })

    if (error) {
      log.error({ err: error }, 'Error updating API key usage')
      throw error
    }
  }

  async listApiKeysByWorkspace(workspaceId: string): Promise<ApiKeyRow[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ err: error }, 'Error listing API keys')
      throw error
    }

    return (data ?? []) as unknown as ApiKeyRow[]
  }

  async deleteApiKey(keyId: string): Promise<void> {
    const { error } = await supabase.from('api_keys').delete().eq('id', keyId)

    if (error) {
      log.error({ err: error }, 'Error deleting API key')
      throw error
    }
  }

  async getApiKeyById(keyId: string): Promise<ApiKeyRow | null> {
    const { data, error } = await supabase.from('api_keys').select('*').eq('id', keyId).single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting API key')
      }
      return null
    }

    return (data as unknown as ApiKeyRow) ?? null
  }

  async getApiKeysByWorkspaceIds(workspaceIds: string[]): Promise<ApiKeyRow[]> {
    if (workspaceIds.length === 0) return []

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .in('workspace_id', workspaceIds)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ err: error }, 'Error listing keys by workspace IDs')
      throw error
    }

    return (data ?? []) as unknown as ApiKeyRow[]
  }

  async updateApiKey(keyId: string, updates: Record<string, any>): Promise<void> {
    const { error } = await supabase.from('api_keys').update(updates).eq('id', keyId)

    if (error) {
      log.error({ err: error }, 'Error updating API key')
      throw error
    }
  }

  async getMemberWorkspacesWithDetails(
    userId: string,
  ): Promise<
    {
      workspace_id: string
      role: string
      workspaces: { id: string; name: string; owner_id: string } | null
    }[]
  > {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(id, name, owner_id)')
      .eq('user_id', userId)

    if (error) {
      log.error({ err: error }, 'Error fetching workspace memberships')
      throw error
    }

    return (data ?? []) as any
  }
}

export const apiKeysRepository: IApiKeysRepository = new ApiKeysRepository()
