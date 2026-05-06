import type { V0App } from '@domains/v0/types/v0.types'

export interface IV0AppsService {
  /** List all V0 apps in a workspace. */
  listApps(userId: string, workspaceId: string): Promise<V0App[]>

  /** Get a specific V0 app. */
  getApp(userId: string, workspaceId: string, appId: string): Promise<V0App | null>

  /** Create a new V0 app. */
  createApp(
    userId: string,
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
  ): Promise<V0App>

  /** Update a V0 app. */
  updateApp(
    userId: string,
    workspaceId: string,
    appId: string,
    updates: Partial<V0App>,
  ): Promise<V0App | null>

  /** Delete a V0 app and optionally revoke its API key. */
  deleteApp(
    userId: string,
    workspaceId: string,
    appId: string,
    revokeApiKey?: boolean,
  ): Promise<boolean>

  /** Set up deployment for a V0 app. */
  setupDeployment(
    userId: string,
    workspaceId: string,
    appId: string,
    data: {
      deploymentUrl: string
      projectId: string
      deploymentPlatform?: 'vercel' | 'netlify' | 'custom'
    },
  ): Promise<V0App | null>

  /** Regenerate API key for a V0 app. */
  regenerateApiKey(userId: string, workspaceId: string, appId: string): Promise<V0App | null>

  /** Get app statistics for a workspace. */
  getWorkspaceStats(
    userId: string,
    workspaceId: string,
  ): Promise<{
    totalApps: number
    deployed: number
    ready: number
    draft: number
    error: number
  }>
}
