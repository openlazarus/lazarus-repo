import * as fs from 'fs/promises'
import * as path from 'path'
import type { IAttachmentDestination, AttachmentContext } from '@domains/email/types/email.types'

// ---------------------------------------------------------------------------
// Destination 1 — Agent message directory (platform-specific primary store)
// ---------------------------------------------------------------------------

/** Platform-to-subdirectory mapping for the primary agent store. */
const PLATFORM_SUBDIR: Record<AttachmentContext['platform'], string> = {
  email: 'inbox',
  whatsapp: 'whatsapp',
  discord: 'discord',
  slack: 'slack',
}

/**
 * Resolves the absolute primary-store path for an attachment.
 * Shared by both destinations so the symlink target is always consistent.
 */
export function resolvePrimaryStorePath(ctx: AttachmentContext): string {
  const subdir = PLATFORM_SUBDIR[ctx.platform] ?? ctx.platform
  return path.join(
    ctx.workspacePath,
    '.agents',
    ctx.agentId,
    subdir,
    ctx.messageId,
    ctx.safeFilename,
  )
}

/**
 * Saves the attachment in the agent's platform-specific message directory.
 *
 * Email:    .agents/{agentId}/inbox/{messageId}/{safeFilename}
 * WhatsApp: .agents/{agentId}/whatsapp/{messageId}/{safeFilename}
 */
export class AgentMessageAttachmentDestination implements IAttachmentDestination {
  readonly name: string

  constructor(private readonly subdir: 'inbox' | 'whatsapp') {
    this.name = `agent-${subdir}`
  }

  async save(ctx: AttachmentContext, buffer: Buffer): Promise<void> {
    const dest = path.join(
      ctx.workspacePath,
      '.agents',
      ctx.agentId,
      this.subdir,
      ctx.messageId,
      ctx.safeFilename,
    )
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, buffer)
  }
}

// ---------------------------------------------------------------------------
// Destination 2 — Workspace files folder (UI-visible symlink, all platforms)
// ---------------------------------------------------------------------------

/**
 * Creates a symlink in the workspace files folder pointing to the primary store.
 *
 * Symlink: files/attachments/{platform}/{agentId}/{date}-{filename}
 *       →  .agents/{agentId}/{subdir}/{messageId}/{safeFilename}
 *
 * Using symlinks instead of copies means there is always a single version
 * of the file. If an agent edits the primary copy, the UI sees the update.
 */
export class WorkspaceFilesAttachmentDestination implements IAttachmentDestination {
  readonly name = 'workspace-files'

  async save(ctx: AttachmentContext, _buffer: Buffer): Promise<void> {
    const datePrefix = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const destDir = path.join(ctx.workspacePath, 'files', 'attachments', ctx.platform, ctx.agentId)
    await fs.mkdir(destDir, { recursive: true })

    const destFilename = `${datePrefix}-${ctx.safeFilename}`
    const destPath = path.join(destDir, destFilename)
    const linkPath = await this.uniquePath(destPath)

    // Compute the primary store path and make the symlink relative
    // so it stays valid if the workspace root is mounted elsewhere.
    const target = resolvePrimaryStorePath(ctx)
    const relativeTarget = path.relative(path.dirname(linkPath), target)

    await fs.symlink(relativeTarget, linkPath)
  }

  private async uniquePath(filePath: string): Promise<string> {
    try {
      await fs.lstat(filePath)
    } catch {
      return filePath // doesn't exist, safe to use
    }

    const ext = path.extname(filePath)
    const base = filePath.slice(0, -ext.length || undefined)
    for (let i = 1; i <= 100; i++) {
      const candidate = `${base}-${i}${ext}`
      try {
        await fs.lstat(candidate)
      } catch {
        return candidate
      }
    }
    return `${base}-${Date.now()}${ext}`
  }
}
