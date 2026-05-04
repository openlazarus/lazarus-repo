import type {
  ApiKeyRow,
  InsertApiKeyParams,
  ValidateApiKeyResult,
} from './workspace-api-keys.repository'

export interface IApiKeysRepository {
  /** Insert a new API key. */
  insertApiKey(params: InsertApiKeyParams): Promise<ApiKeyRow>
  /** Validate an API key via RPC. */
  validateApiKeyRpc(keyHash: string): Promise<ValidateApiKeyResult[]>
  /** Update the last-used timestamp for an API key via RPC. */
  updateApiKeyUsageRpc(keyHash: string): Promise<void>
  /** List all API keys for a workspace. */
  listApiKeysByWorkspace(workspaceId: string): Promise<ApiKeyRow[]>
  /** Delete an API key by ID. */
  deleteApiKey(keyId: string): Promise<void>
  /** Get a single API key by ID. */
  getApiKeyById(keyId: string): Promise<ApiKeyRow | null>
  /** Get API keys for multiple workspace IDs. */
  getApiKeysByWorkspaceIds(workspaceIds: string[]): Promise<ApiKeyRow[]>
  /** Update fields on an API key. */
  updateApiKey(keyId: string, updates: Record<string, any>): Promise<void>
  /** Get workspace memberships with workspace details for a user. */
  getMemberWorkspacesWithDetails(
    userId: string,
  ): Promise<
    {
      workspace_id: string
      role: string
      workspaces: { id: string; name: string; owner_id: string } | null
    }[]
  >
}
