import * as crypto from 'crypto'
import { apiKeysRepository } from '@domains/workspace/repository/workspace-api-keys.repository'
import type { WorkspaceApiKey, ApiKeyWithSecret } from '@domains/workspace/types/workspace.types'
import type { IWorkspaceApiKeyService } from './workspace-api-keys.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace-api-keys')

/**
 * Service for managing workspace API keys
 * All keys are stored in Supabase
 */
export class WorkspaceApiKeyService implements IWorkspaceApiKeyService {
  /**
   * Generate a secure API key
   */
  public generateApiKey(): { id: string; key: string; hash: string; prefix: string } {
    const id = this.generateId()
    const keyBytes = crypto.randomBytes(32)
    const key = `lzrs_${keyBytes.toString('base64url')}`
    const hash = this.hashApiKey(key)
    const prefix = key.substring(0, 12)

    return { id, key, hash, prefix }
  }

  /**
   * Hash an API key using SHA-256
   */
  public hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `key_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
  }

  /**
   * Create a new API key for a workspace
   */
  public async createApiKey(
    workspaceId: string,
    userId: string,
    options: {
      name: string
      databases?: string[]
      operations?: ('read' | 'write' | 'delete')[]
      expiresInDays?: number
      rateLimit?: number
    },
  ): Promise<ApiKeyWithSecret> {
    const { key, hash, prefix } = this.generateApiKey()
    const expiresAt = options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const permissions = {
      databases: options.databases || ['*'],
      operations: options.operations || ['read', 'write', 'delete'],
    }

    const row = await apiKeysRepository.insertApiKey({
      workspace_id: workspaceId,
      key_hash: hash,
      key_prefix: prefix,
      name: options.name,
      permissions,
      rate_limit: options.rateLimit || 100,
      expires_at: expiresAt,
      created_by: userId,
    })

    log.info(`Created API key ${row.id} for workspace ${workspaceId}`)

    return {
      id: row.id,
      workspaceId,
      name: options.name,
      keyPrefix: prefix,
      createdAt: row.created_at,
      expiresAt: row.expires_at || undefined,
      createdBy: userId,
      permissions,
      rateLimit: options.rateLimit || 100,
      key, // Plaintext key - only shown once!
    }
  }

  /**
   * Validate an API key and return its metadata
   */
  public async validateApiKey(key: string): Promise<WorkspaceApiKey | null> {
    const hash = this.hashApiKey(key)

    try {
      const results = await apiKeysRepository.validateApiKeyRpc(hash)

      if (!results || results.length === 0) {
        return null
      }

      const apiKeyData = results[0]!
      if (!apiKeyData.is_valid) {
        return null
      }

      // Update last used timestamp (async, don't wait)
      this.updateLastUsed(hash).catch((err) => {
        log.error({ err: err }, 'Failed to update lastUsedAt')
      })

      return {
        id: apiKeyData.id,
        workspaceId: apiKeyData.workspace_id,
        name: '',
        keyHash: hash,
        keyPrefix: '',
        createdAt: new Date().toISOString(),
        permissions: apiKeyData.permissions as WorkspaceApiKey['permissions'],
        rateLimit: apiKeyData.rate_limit,
      }
    } catch (error) {
      log.error({ err: error }, 'Error validating API key')
      return null
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyHash: string): Promise<void> {
    try {
      await apiKeysRepository.updateApiKeyUsageRpc(keyHash)
    } catch (error) {
      log.error({ err: error }, 'Error updating last used timestamp')
    }
  }

  /**
   * List all API keys for a workspace (without key hashes)
   */
  public async listApiKeys(workspaceId: string): Promise<Omit<WorkspaceApiKey, 'keyHash'>[]> {
    try {
      const keys = await apiKeysRepository.listApiKeysByWorkspace(workspaceId)

      return keys.map((k) => ({
        id: k.id,
        workspaceId: k.workspace_id,
        name: k.name,
        keyPrefix: k.key_prefix,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at || undefined,
        expiresAt: k.expires_at || undefined,
        createdBy: k.created_by,
        permissions: k.permissions as WorkspaceApiKey['permissions'],
        rateLimit: k.rate_limit,
      }))
    } catch (error) {
      log.error({ err: error }, 'Error listing keys')
      return []
    }
  }

  /**
   * Revoke (delete) an API key
   */
  public async revokeApiKey(keyId: string): Promise<boolean> {
    try {
      await apiKeysRepository.deleteApiKey(keyId)
      log.info(`Revoked API key ${keyId}`)
      return true
    } catch (error) {
      log.error({ err: error }, 'Error revoking key')
      return false
    }
  }

  /**
   * Get a specific API key by ID
   */
  public async getApiKey(keyId: string): Promise<Omit<WorkspaceApiKey, 'keyHash'> | null> {
    const key = await apiKeysRepository.getApiKeyById(keyId)

    if (!key) {
      return null
    }

    return {
      id: key.id,
      workspaceId: key.workspace_id,
      name: key.name,
      keyPrefix: key.key_prefix,
      createdAt: key.created_at,
      lastUsedAt: key.last_used_at || undefined,
      expiresAt: key.expires_at || undefined,
      createdBy: key.created_by,
      permissions: key.permissions as WorkspaceApiKey['permissions'],
      rateLimit: key.rate_limit,
    }
  }

  /**
   * List all API keys for workspaces where user is owner or has developer role
   */
  public async listAllApiKeysForUser(
    userId: string,
  ): Promise<(Omit<WorkspaceApiKey, 'keyHash'> & { workspaceName?: string })[]> {
    try {
      const memberships = await apiKeysRepository.getMemberWorkspacesWithDetails(userId)

      if (!memberships || memberships.length === 0) {
        return []
      }

      // Filter to workspaces where user is owner or has developer role
      const workspaceMap = new Map<string, string>()
      const workspaceIds: string[] = []
      for (const m of memberships) {
        const ws = m.workspaces as Record<string, any>
        if (!ws?.id) continue

        const isOwner = ws.owner_id === userId
        const isDeveloper = m.role === 'developer'

        if (isOwner || isDeveloper) {
          workspaceIds.push(ws.id)
          workspaceMap.set(ws.id, ws.name || 'Unknown workspace')
        }
      }

      if (workspaceIds.length === 0) {
        return []
      }

      const keys = await apiKeysRepository.getApiKeysByWorkspaceIds(workspaceIds)

      return keys.map((k) => ({
        id: k.id,
        workspaceId: k.workspace_id,
        workspaceName: workspaceMap.get(k.workspace_id),
        name: k.name,
        keyPrefix: k.key_prefix,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at || undefined,
        expiresAt: k.expires_at || undefined,
        createdBy: k.created_by,
        permissions: k.permissions as WorkspaceApiKey['permissions'],
        rateLimit: k.rate_limit,
      }))
    } catch (error) {
      log.error({ err: error }, 'Error listing all keys for user')
      return []
    }
  }

  /**
   * Update API key permissions
   */
  public async updateApiKeyPermissions(
    keyId: string,
    permissions: {
      databases?: string[]
      operations?: ('read' | 'write' | 'delete')[]
    },
    rateLimit?: number,
  ): Promise<boolean> {
    const updates: any = {}

    if (permissions.databases || permissions.operations) {
      const currentKey = await this.getApiKey(keyId)
      if (!currentKey) {
        return false
      }

      updates.permissions = {
        databases: permissions.databases || currentKey.permissions.databases,
        operations: permissions.operations || currentKey.permissions.operations,
      }
    }

    if (rateLimit !== undefined) {
      updates.rate_limit = rateLimit
    }

    try {
      await apiKeysRepository.updateApiKey(keyId, updates)
      return true
    } catch (error) {
      log.error({ err: error }, 'Error updating API key')
      return false
    }
  }
}

// Export singleton instance
export const workspaceApiKeyService: IWorkspaceApiKeyService = new WorkspaceApiKeyService()
