/**
 * Shared workspace file reader utility.
 *
 * Resolves a relative path inside a workspace directory, validates it stays
 * within bounds (path-traversal check), enforces a per-file size limit, reads
 * the file into a Buffer, and detects the MIME content type.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { getContentType } from './mime-types'

// Re-export so callers can grab getContentType from either place
export { getContentType } from './mime-types'

// ---------------------------------------------------------------------------
// Platform size limits (bytes)
// ---------------------------------------------------------------------------

export const PLATFORM_SIZE_LIMITS = {
  email: 10 * 1024 * 1024, // 10 MB
  discord: 25 * 1024 * 1024, // 25 MB (bot default; boosted servers 50 MB)
  slack: 50 * 1024 * 1024, // 50 MB (requires files:write scope)
  whatsapp: 16 * 1024 * 1024, // 16 MB
} as const

export type Platform = keyof typeof PLATFORM_SIZE_LIMITS

// ---------------------------------------------------------------------------
// Core reader
// ---------------------------------------------------------------------------

export interface ReadWorkspaceFileOptions {
  /** Maximum allowed file size in bytes. Defaults to 10 MB (email limit). */
  maxSize?: number
}

export interface WorkspaceFile {
  filename: string
  contentType: string
  content: Buffer
  size: number
}

/**
 * Read a file from a workspace directory with path-traversal protection and
 * size enforcement.
 *
 * @param workspacePath  Absolute path to the workspace root directory.
 * @param relativePath   Path relative to the workspace (e.g. "./report.pdf").
 * @param opts           Optional overrides (maxSize).
 */
export async function readWorkspaceFile(
  workspacePath: string,
  relativePath: string,
  opts?: ReadWorkspaceFileOptions,
): Promise<WorkspaceFile> {
  const maxSize = opts?.maxSize ?? PLATFORM_SIZE_LIMITS.email

  // Resolve and validate path stays within workspace
  const filePath = path.join(workspacePath, relativePath)
  const resolvedPath = path.resolve(filePath)
  const resolvedWorkspace = path.resolve(workspacePath)

  if (
    !resolvedPath.startsWith(resolvedWorkspace + path.sep) &&
    resolvedPath !== resolvedWorkspace
  ) {
    throw new Error(
      `Invalid file path: ${relativePath} (path traversal detected — must stay within workspace)`,
    )
  }

  // Check existence
  try {
    await fs.access(filePath)
  } catch {
    throw new Error(`File not found: ${relativePath}`)
  }

  // Size check
  const stats = await fs.stat(filePath)
  if (stats.size > maxSize) {
    const limitMB = (maxSize / 1024 / 1024).toFixed(0)
    const actualMB = (stats.size / 1024 / 1024).toFixed(2)
    throw new Error(`File too large: ${relativePath} (${actualMB} MB exceeds ${limitMB} MB limit)`)
  }

  const content = await fs.readFile(filePath)
  const filename = path.basename(relativePath)
  const contentType = getContentType(filename)

  return { filename, contentType, content, size: stats.size }
}
