import * as fs from 'fs/promises'
import * as path from 'path'
import type { V0App } from '@domains/v0/types/v0.types'
import { workspaceApiKeyService } from '@domains/workspace/service/workspace-api-keys.service'
import { v0EnvSyncService } from './v0-env-sync.service'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import type { IV0AppsService } from './v0-apps.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('v0-apps')

/**
 * Service for managing V0 apps stored as .app files in workspaces
 */
export class V0AppsService implements IV0AppsService {
  constructor(_basePath: string = './storage') {}

  /**
   * Get the workspace directory path using settings.path from Supabase
   */
  private async getWorkspacePath(workspaceId: string): Promise<string> {
    return resolveWorkspacePath(workspaceId)
  }

  /**
   * Get the path to a .app file
   */
  private async getAppFilePath(workspaceId: string, appId: string): Promise<string> {
    const workspacePath = await this.getWorkspacePath(workspaceId)
    return path.join(workspacePath, `${appId}.app`)
  }

  /**
   * Generate a unique app ID from name
   */
  private generateAppId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    const timestamp = Date.now().toString(36)
    return `${slug}_${timestamp}`
  }

  /**
   * List all V0 apps in a workspace
   */
  async listApps(_userId: string, workspaceId: string): Promise<V0App[]> {
    try {
      const workspacePath = await this.getWorkspacePath(workspaceId)
      const files = await fs.readdir(workspacePath)
      const appFiles = files.filter((f) => f.endsWith('.app'))

      const apps: V0App[] = []
      for (const file of appFiles) {
        try {
          const appPath = path.join(workspacePath, file)
          const content = await fs.readFile(appPath, 'utf-8')
          const app = JSON.parse(content) as V0App
          apps.push(app)
        } catch (error) {
          log.error({ err: error }, `Error reading ${file}:`)
          // Skip invalid files
        }
      }

      return apps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      log.error({ err: error }, 'Error listing apps')
      return []
    }
  }

  /**
   * Get a specific V0 app
   */
  async getApp(_userId: string, workspaceId: string, appId: string): Promise<V0App | null> {
    const appPath = await this.getAppFilePath(workspaceId, appId)

    try {
      const content = await fs.readFile(appPath, 'utf-8')
      return JSON.parse(content) as V0App
    } catch (error) {
      log.error({ err: error }, `Error reading app ${appId}:`)
      return null
    }
  }

  /**
   * Create a new V0 app
   */
  async createApp(
    _userId: string,
    workspaceId: string,
    data: {
      name: string
      description?: string
      chatId?: string
      projectId?: string
      webUrl?: string
      features?: string[]
      technicalStack?: string[]
    },
  ): Promise<V0App> {
    const now = new Date().toISOString()
    const appId = this.generateAppId(data.name)

    const app: V0App = {
      id: appId,
      name: data.name,
      description: data.description,
      chatId: data.chatId,
      projectId: data.projectId,
      webUrl: data.webUrl,
      status: data.chatId || data.projectId ? 'ready' : 'draft',
      features: data.features,
      technicalStack: data.technicalStack,
      createdAt: now,
      updatedAt: now,
    }

    const appPath = await this.getAppFilePath(workspaceId, appId)
    await fs.writeFile(appPath, JSON.stringify(app, null, 2), 'utf-8')

    log.info(`Created app ${appId} in workspace ${workspaceId}`)
    return app
  }

  /**
   * Update a V0 app
   */
  async updateApp(
    userId: string,
    workspaceId: string,
    appId: string,
    updates: Partial<V0App>,
  ): Promise<V0App | null> {
    const app = await this.getApp(userId, workspaceId, appId)
    if (!app) {
      return null
    }

    const updatedApp: V0App = {
      ...app,
      ...updates,
      id: app.id, // Prevent ID change
      createdAt: app.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    }

    const appPath = await this.getAppFilePath(workspaceId, appId)
    await fs.writeFile(appPath, JSON.stringify(updatedApp, null, 2), 'utf-8')

    log.info(`Updated app ${appId}`)
    return updatedApp
  }

  /**
   * Delete a V0 app and optionally revoke its API key
   */
  async deleteApp(
    userId: string,
    workspaceId: string,
    appId: string,
    revokeApiKey: boolean = true,
  ): Promise<boolean> {
    const app = await this.getApp(userId, workspaceId, appId)
    if (!app) {
      return false
    }

    // Revoke API key if it exists
    if (revokeApiKey && app.apiKeyId) {
      try {
        await workspaceApiKeyService.revokeApiKey(app.apiKeyId)
        log.info(`Revoked API key ${app.apiKeyId} for app ${appId}`)
      } catch (error) {
        log.error({ err: error }, `Failed to revoke API key for app ${appId}:`)
        // Continue with deletion even if revocation fails
      }
    }

    // Delete .app file
    const appPath = await this.getAppFilePath(workspaceId, appId)
    try {
      await fs.unlink(appPath)
      log.info(`Deleted app ${appId}`)
      return true
    } catch (error) {
      log.error({ err: error }, `Error deleting app ${appId}:`)
      return false
    }
  }

  /**
   * Set up deployment for a V0 app
   * Creates API key and syncs to V0 project
   */
  async setupDeployment(
    userId: string,
    workspaceId: string,
    appId: string,
    data: {
      deploymentUrl: string
      projectId: string
      deploymentPlatform?: 'vercel' | 'netlify' | 'custom'
    },
  ): Promise<V0App | null> {
    const app = await this.getApp(userId, workspaceId, appId)
    if (!app) {
      return null
    }

    try {
      // Create dedicated API key for this app
      const apiKey = await workspaceApiKeyService.createApiKey(workspaceId, userId, {
        name: `V0 App: ${app.name}`,
        databases: ['*'], // Full access by default
        operations: ['read', 'write', 'delete'],
      })

      // Sync API key to V0 project
      await v0EnvSyncService.syncApiKeyToV0Project(data.projectId, workspaceId, apiKey.key)

      // Update app with deployment info
      const updatedApp = await this.updateApp(userId, workspaceId, appId, {
        deploymentUrl: data.deploymentUrl,
        projectId: data.projectId,
        deploymentPlatform: data.deploymentPlatform || 'vercel',
        deploymentStatus: 'deployed',
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        syncedAt: new Date().toISOString(),
        status: 'deployed',
        environmentVars: [
          { key: 'LAZARUS_API_KEY', value: 'lzrs_***', synced: true },
          { key: 'LAZARUS_WORKSPACE_ID', value: workspaceId, synced: true },
          {
            key: 'LAZARUS_API_URL',
            value: process.env.PUBLIC_API_URL || 'http://localhost:8000',
            synced: true,
          },
        ],
      })

      log.info(`Set up deployment for app ${appId}`)
      return updatedApp
    } catch (error) {
      log.error({ err: error }, `Failed to set up deployment for app ${appId}:`)

      // Mark as error
      await this.updateApp(userId, workspaceId, appId, {
        status: 'error',
        deploymentStatus: 'failed',
        deploymentError: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Regenerate API key for a V0 app
   * Useful if key is compromised or needs rotation
   */
  async regenerateApiKey(
    userId: string,
    workspaceId: string,
    appId: string,
  ): Promise<V0App | null> {
    const app = await this.getApp(userId, workspaceId, appId)
    if (!app) {
      return null
    }

    if (!app.projectId) {
      throw new Error('Cannot regenerate API key: app has no projectId')
    }

    // Revoke old API key
    if (app.apiKeyId) {
      await workspaceApiKeyService.revokeApiKey(app.apiKeyId)
    }

    // Create new API key
    const apiKey = await workspaceApiKeyService.createApiKey(workspaceId, userId, {
      name: `V0 App: ${app.name}`,
      databases: ['*'],
      operations: ['read', 'write', 'delete'],
    })

    // Sync to V0 project
    await v0EnvSyncService.syncApiKeyToV0Project(app.projectId, workspaceId, apiKey.key)

    // Update app
    const updatedApp = await this.updateApp(userId, workspaceId, appId, {
      apiKeyId: apiKey.id,
      apiKeyName: apiKey.name,
      syncedAt: new Date().toISOString(),
    })

    log.info(`Regenerated API key for app ${appId}`)
    return updatedApp
  }

  /**
   * Get app statistics for a workspace
   */
  async getWorkspaceStats(
    userId: string,
    workspaceId: string,
  ): Promise<{
    totalApps: number
    deployed: number
    ready: number
    draft: number
    error: number
  }> {
    const apps = await this.listApps(userId, workspaceId)

    return {
      totalApps: apps.length,
      deployed: apps.filter((a) => a.status === 'deployed').length,
      ready: apps.filter((a) => a.status === 'ready').length,
      draft: apps.filter((a) => a.status === 'draft').length,
      error: apps.filter((a) => a.status === 'error').length,
    }
  }
}

// Export singleton instance
export const v0AppsService: IV0AppsService = new V0AppsService()
