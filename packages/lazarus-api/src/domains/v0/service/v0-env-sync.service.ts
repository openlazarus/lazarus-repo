import { v0 } from 'v0-sdk'
import type { IV0EnvSyncService } from './v0-env-sync.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('v0-env-sync')

/**
 * Service for syncing workspace API keys to v0 project environment variables
 */
export class V0EnvSyncService implements IV0EnvSyncService {
  /**
   * Sync API key to v0 project environment variables
   * This automatically injects the API key into the v0 project so it can be used server-side
   */
  async syncApiKeyToV0Project(
    v0ProjectId: string,
    workspaceId: string,
    apiKey: string,
  ): Promise<void> {
    try {
      await v0.projects.createEnvVars({
        projectId: v0ProjectId,
        environmentVariables: [
          {
            key: 'LAZARUS_API_KEY',
            value: apiKey,
          },
          {
            key: 'LAZARUS_WORKSPACE_ID',
            value: workspaceId,
          },
          {
            key: 'LAZARUS_API_URL',
            value:
              process.env.PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000',
          },
        ],
        upsert: true, // Create or update
      })

      log.info(`Successfully synced API key to v0 project ${v0ProjectId}`)
    } catch (error) {
      log.error({ err: error }, `Failed to sync API key to v0 project ${v0ProjectId}:`)
      throw new Error(
        `Failed to sync API key to v0 project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Remove API key from v0 project environment variables
   * Called when an API key is revoked
   */
  async removeApiKeyFromV0Project(v0ProjectId: string): Promise<void> {
    try {
      // Get all env vars for the project
      const envVarsResponse = await v0.projects.findEnvVars({
        projectId: v0ProjectId,
        decrypted: false,
      })

      // Find the LAZARUS_API_KEY var
      const lazarusKeyVar = envVarsResponse.data.find((v) => v.key === 'LAZARUS_API_KEY')

      if (lazarusKeyVar && lazarusKeyVar.id) {
        // Delete it
        await v0.projects.deleteEnvVars({
          projectId: v0ProjectId,
          environmentVariableIds: [lazarusKeyVar.id],
        })

        log.info(`Successfully removed API key from v0 project ${v0ProjectId}`)
      }
    } catch (error) {
      log.error({ err: error }, `Failed to remove API key from v0 project ${v0ProjectId}:`)
      // Don't throw - this is a cleanup operation, we don't want to block key revocation
    }
  }

  /**
   * Check if v0 project has Lazarus API key configured
   */
  async hasApiKeyConfigured(v0ProjectId: string): Promise<boolean> {
    try {
      const envVarsResponse = await v0.projects.findEnvVars({
        projectId: v0ProjectId,
        decrypted: false,
      })

      return envVarsResponse.data.some((v) => v.key === 'LAZARUS_API_KEY')
    } catch (error) {
      log.error(
        { err: error },
        `Failed to check API key configuration for v0 project ${v0ProjectId}:`,
      )
      return false
    }
  }
}

// Export singleton instance
export const v0EnvSyncService: IV0EnvSyncService = new V0EnvSyncService()
