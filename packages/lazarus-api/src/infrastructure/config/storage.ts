import * as path from 'path'
import '../../load-env'

/**
 * Root directory for persisted workspace/user data (and the basis for Claude JSONL paths).
 *
 * Defaults to `./storage` relative to the process cwd so a fresh checkout works without
 * config. Set `STORAGE_BASE_PATH` in production (e.g. an attached EBS mount) so data
 * lives outside the deployment artifact.
 *
 * Optional `WORKSPACE_PATH_REMOTE_PREFIX` rewrites DB-stored VM paths to `STORAGE_BASE_PATH`;
 * useful when developing locally against a Supabase whose paths point at production VMs.
 */
export const STORAGE_BASE_PATH = process.env.STORAGE_BASE_PATH || './storage'

/**
 * Get absolute path to storage
 * @param relativePath - relative path within storage
 * @returns absolute path
 */
export function getStoragePath(...relativePath: string[]): string {
  return path.join(STORAGE_BASE_PATH, ...relativePath)
}

/**
 * When WORKSPACE_PATH_REMOTE_PREFIX is set (e.g. /mnt/sdc/storage), rewrite DB paths to STORAGE_BASE_PATH.
 * Local dev against shared Supabase; leave unset in production.
 */
export function remapWorkspaceFilesystemPath(p: string): string {
  const remote = process.env.WORKSPACE_PATH_REMOTE_PREFIX?.trim()
  if (!remote || !p) return p
  const prefix = remote.replace(/\/+$/, '')
  if (!p.startsWith(prefix)) return p
  const tail = p.slice(prefix.length).replace(/^\/+/, '')
  return tail ? path.join(STORAGE_BASE_PATH, tail) : STORAGE_BASE_PATH
}
