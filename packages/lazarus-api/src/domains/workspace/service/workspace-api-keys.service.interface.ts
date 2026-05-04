import type { WorkspaceApiKey, ApiKeyWithSecret } from '@domains/workspace/types/workspace.types'

export interface IWorkspaceApiKeyService {
  /** Generate a secure API key. */
  generateApiKey(): { id: string; key: string; hash: string; prefix: string }

  /** Hash an API key using SHA-256. */
  hashApiKey(key: string): string

  /** Create a new API key for a workspace. */
  createApiKey(
    workspaceId: string,
    userId: string,
    options: {
      name: string
      databases?: string[]
      operations?: ('read' | 'write' | 'delete')[]
      expiresInDays?: number
      rateLimit?: number
    },
  ): Promise<ApiKeyWithSecret>

  /** Validate an API key and return its metadata. */
  validateApiKey(key: string): Promise<WorkspaceApiKey | null>

  /** List all API keys for a workspace (without key hashes). */
  listApiKeys(workspaceId: string): Promise<Omit<WorkspaceApiKey, 'keyHash'>[]>

  /** Revoke (delete) an API key. */
  revokeApiKey(keyId: string): Promise<boolean>

  /** Get a specific API key by ID. */
  getApiKey(keyId: string): Promise<Omit<WorkspaceApiKey, 'keyHash'> | null>

  /** List all API keys for workspaces where user is owner or has developer role. */
  listAllApiKeysForUser(
    userId: string,
  ): Promise<(Omit<WorkspaceApiKey, 'keyHash'> & { workspaceName?: string })[]>

  /** Update API key permissions. */
  updateApiKeyPermissions(
    keyId: string,
    permissions: {
      databases?: string[]
      operations?: ('read' | 'write' | 'delete')[]
    },
    rateLimit?: number,
  ): Promise<boolean>
}
