import * as path from 'path'
import { STORAGE_BASE_PATH, remapWorkspaceFilesystemPath } from '@infrastructure/config/storage'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { createLogger } from '@utils/logger'

const log = createLogger('workspace-transcript-path')

/**
 * Resolves the on-disk workspace root for a user/workspace (settings.path or legacy layout),
 * then rewrites VM/remote prefixes onto STORAGE_BASE_PATH when WORKSPACE_PATH_REMOTE_PREFIX is set.
 */
export async function resolveWorkspaceFilesystemPath(
  effectiveWorkspaceId: string,
): Promise<string> {
  let workspacePath: string
  try {
    const settings = (await workspaceRepository.getWorkspaceSettings(
      effectiveWorkspaceId,
    )) as Record<string, unknown> | null
    if (settings?.path && typeof settings.path === 'string') {
      workspacePath = settings.path
      log.info({ data: workspacePath }, 'Using workspace settings.path')
    } else {
      workspacePath = path.join(STORAGE_BASE_PATH, 'workspaces', effectiveWorkspaceId)
      log.info({ data: workspacePath }, 'Using workspace storage path')
    }
  } catch (err) {
    log.error({ err }, 'Exception fetching workspace settings')
    workspacePath = path.join(STORAGE_BASE_PATH, 'workspaces', effectiveWorkspaceId)
  }
  return remapWorkspaceFilesystemPath(workspacePath)
}

/**
 * Path to Claude Code JSONL transcript for a session (matches CLI project slug derivation).
 *
 * `claudeHome` is the parent of `.../storage` (strip trailing `/storage` from STORAGE_BASE_PATH),
 * so `.claude/projects/...` lines up with the same layout as production (e.g. `/mnt/sdc` + `/mnt/sdc/storage`)
 * and local dev (`$HOME` + `$HOME/storage` when STORAGE_BASE_PATH points at `~/storage`).
 */
export async function resolveClaudeSessionJsonlPath(
  effectiveWorkspaceId: string,
  sessionId: string,
): Promise<string> {
  const workspacePath = await resolveWorkspaceFilesystemPath(effectiveWorkspaceId)
  const normalizedPath =
    '-' +
    workspacePath
      .split('/')
      .filter((p) => p)
      .join('-')
      .replace(/_/g, '-')
  const claudeHome = STORAGE_BASE_PATH.replace(/\/storage\/?$/, '')
  const claudeDir = path.join(claudeHome, '.claude', 'projects', normalizedPath)
  return path.join(claudeDir, `${sessionId}.jsonl`)
}
