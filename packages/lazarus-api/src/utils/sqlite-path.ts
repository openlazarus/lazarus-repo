/**
 * SQLite Path Utilities
 *
 * Provides secure path resolution for SQLite databases within workspaces.
 * Supports nested paths (e.g., "folder/subfolder/database") while preventing
 * path traversal attacks.
 */

import * as path from 'path'
import * as fs from 'fs'

/**
 * Validates and resolves a database path within a workspace.
 * Supports nested paths like "folder/subfolder/database.db"
 * Prevents path traversal attacks.
 *
 * @param workspacePath - The base workspace directory path
 * @param dbPath - The database path (can include folders, with or without .db extension)
 * @returns The full resolved path to the database file
 * @throws Error if path traversal is detected or path contains invalid characters
 *
 * @example
 * // Simple database in workspace root
 * resolveSecureDatabasePath('/workspace', 'users')
 * // Returns: /workspace/users.db
 *
 * @example
 * // Nested database
 * resolveSecureDatabasePath('/workspace', 'data/2024/sales')
 * // Returns: /workspace/data/2024/sales.db
 */
export function resolveSecureDatabasePath(workspacePath: string, dbPath: string): string {
  // 1. Normalize the input path
  let normalizedPath = dbPath.trim()

  // 2. Remove .db extension if present (we'll add it back)
  if (normalizedPath.endsWith('.db')) {
    normalizedPath = normalizedPath.slice(0, -3)
  }

  // 3. Block path traversal sequences
  if (normalizedPath.includes('..')) {
    throw new Error('Path traversal not allowed: ".." sequences are forbidden')
  }

  // 4. Block absolute paths
  if (path.isAbsolute(normalizedPath)) {
    throw new Error('Absolute paths not allowed')
  }

  // 5. Block backslashes (Windows-style paths)
  if (normalizedPath.includes('\\')) {
    throw new Error('Backslashes not allowed in database path')
  }

  // 6. Sanitize path segments (allow alphanumeric, _, -)
  const segments = normalizedPath.split('/').filter((s) => s.length > 0)

  if (segments.length === 0) {
    throw new Error('Database path cannot be empty')
  }

  for (const segment of segments) {
    if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
      throw new Error(
        `Invalid path segment: "${segment}". Use alphanumeric characters, underscores, or hyphens only.`,
      )
    }
  }

  // 7. Reconstruct safe path
  const safePath = segments.join('/')
  const fullPath = path.join(workspacePath, `${safePath}.db`)

  // 8. Final verification: resolved path must be inside workspace
  const resolvedWorkspace = path.resolve(workspacePath)
  const resolvedFull = path.resolve(fullPath)

  if (!resolvedFull.startsWith(resolvedWorkspace + path.sep)) {
    throw new Error('Path traversal detected: resolved path outside workspace')
  }

  return fullPath
}

/**
 * Check if a database exists at the given path.
 *
 * @param workspacePath - The base workspace directory path
 * @param dbPath - The database path to check
 * @returns true if the database file exists, false otherwise
 */
export function databaseExists(workspacePath: string, dbPath: string): boolean {
  try {
    const fullPath = resolveSecureDatabasePath(workspacePath, dbPath)
    return fs.existsSync(fullPath)
  } catch {
    return false
  }
}

/**
 * Ensures the parent directory for a database path exists.
 * Creates intermediate directories if needed.
 *
 * @param workspacePath - The base workspace directory path
 * @param dbPath - The database path
 * @returns The full resolved path to the database file
 */
export function ensureDatabaseDirectory(workspacePath: string, dbPath: string): string {
  const fullPath = resolveSecureDatabasePath(workspacePath, dbPath)
  const dir = path.dirname(fullPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  return fullPath
}

/**
 * Extracts the database name from a path (last segment without extension).
 *
 * @param dbPath - The database path
 * @returns The database name
 *
 * @example
 * getDatabaseName('folder/subfolder/users.db') // Returns: 'users'
 * getDatabaseName('users') // Returns: 'users'
 */
export function getDatabaseName(dbPath: string): string {
  let normalized = dbPath.trim()
  if (normalized.endsWith('.db')) {
    normalized = normalized.slice(0, -3)
  }
  const segments = normalized.split('/').filter((s) => s.length > 0)
  return segments[segments.length - 1] || normalized
}
