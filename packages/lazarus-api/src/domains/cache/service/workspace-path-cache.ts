/**
 * Cached workspace path resolution
 *
 * Resolves workspace filesystem paths from database settings with a 24-hour cache.
 * Workspace paths are set at creation time and rarely change, making them ideal
 * for long-lived caching.
 *
 * This replaces ~12 duplicate getWorkspacePath() implementations across the codebase
 * that each independently queried Supabase on every call.
 */

import * as path from 'path'
import { STORAGE_BASE_PATH } from '@infrastructure/config/storage'
import { TtlCache } from './ttl-cache'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'

const WORKSPACE_PATH_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const cache = new TtlCache<string, string>({
  ttlMs: WORKSPACE_PATH_TTL_MS,
  maxSize: 1_000,
})

/**
 * Resolve the filesystem path for a workspace.
 * Results are cached for 24 hours since workspace paths rarely change.
 *
 * @param workspaceId - The workspace ID to resolve
 * @returns The absolute filesystem path to the workspace directory
 * @throws Error if workspace not found
 */
export async function resolveWorkspacePath(workspaceId: string): Promise<string> {
  const cached = cache.get(workspaceId)
  if (cached) return cached

  const workspace = await workspaceRepository.findWorkspaceById(workspaceId)

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`)
  }

  const settings = workspace.settings as Record<string, any> | null
  const resolvedPath = settings?.path
    ? settings.path
    : path.join(STORAGE_BASE_PATH, 'workspaces', workspaceId)

  cache.set(workspaceId, resolvedPath)
  return resolvedPath
}

/**
 * Invalidate the cached path for a workspace.
 * Call this if a workspace's path is ever changed (rare).
 */
export function invalidateWorkspacePath(workspaceId: string): void {
  cache.delete(workspaceId)
}

/**
 * Clear the entire workspace path cache.
 */
export function clearWorkspacePathCache(): void {
  cache.clear()
}
