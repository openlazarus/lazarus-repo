export interface IV0EnvSyncService {
  /** Sync API key to v0 project environment variables. */
  syncApiKeyToV0Project(v0ProjectId: string, workspaceId: string, apiKey: string): Promise<void>

  /** Remove API key from v0 project environment variables. */
  removeApiKeyFromV0Project(v0ProjectId: string): Promise<void>

  /** Check if v0 project has Lazarus API key configured. */
  hasApiKeyConfigured(v0ProjectId: string): Promise<boolean>
}
