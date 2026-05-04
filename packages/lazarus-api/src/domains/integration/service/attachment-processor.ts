/**
 * Attachment Processor Service
 *
 * Handles downloading and processing attachments from Discord and Slack.
 * Discord CDN URLs expire, so we persist attachments to the filesystem.
 * Slack requires authentication to download files.
 *
 * Storage location: {workspacePath}/integrations/{platform}/attachments/
 */

import type {
  AttachmentMetadata,
  DiscordAttachment,
  ProcessedAttachment,
  SlackFile,
} from '@domains/integration/types/integration.types'
import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'

export type { AttachmentMetadata, DiscordAttachment, ProcessedAttachment, SlackFile }

import type { IAttachmentProcessor } from './attachment-processor.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('attachment-processor')

export class AttachmentProcessor implements IAttachmentProcessor {
  /**
   * Create a symlink in the workspace files folder pointing to the actual
   * attachment file in the integrations directory (best-effort).
   *
   * Symlink: files/attachments/{platform}/{agentId}/{date}-{filename}
   *       →  integrations/{platform}/attachments/{timestamp}_{filename}
   */
  private async mirrorToWorkspaceFiles(
    actualFilePath: string,
    workspacePath: string,
    agentId: string,
    filename: string,
    platform: 'discord' | 'slack',
  ): Promise<void> {
    try {
      const safeFilename = this.sanitizeFilename(filename)
      const datePrefix = new Date().toISOString().slice(0, 10)
      const destDir = path.join(workspacePath, 'files', 'attachments', platform, agentId)
      await fs.mkdir(destDir, { recursive: true })

      const destFilename = `${datePrefix}-${safeFilename}`
      const linkPath = path.join(destDir, destFilename)

      // Relative symlink so it stays valid across mounts
      const relativeTarget = path.relative(path.dirname(linkPath), actualFilePath)
      await fs.symlink(relativeTarget, linkPath)
    } catch (err) {
      log.error({ err: err }, `Workspace files mirror failed for ${filename}:`)
    }
  }

  /**
   * Get workspace path from settings (same pattern as files-api.ts)
   */
  private async getWorkspacePath(workspaceId: string): Promise<string> {
    return resolveWorkspacePath(workspaceId)
  }

  /**
   * Get the attachments directory for a platform within a workspace
   */
  private getAttachmentsDir(workspacePath: string, platform: 'discord' | 'slack'): string {
    return path.join(workspacePath, 'integrations', platform, 'attachments')
  }

  private async fetchAttachment(url: string): Promise<Response> {
    return fetch(url, {
      headers: { 'User-Agent': 'Lazarus/1.0' },
    })
  }

  private async downloadDiscordAttachment(attachment: DiscordAttachment): Promise<Buffer> {
    const primaryUrl = attachment.proxy_url || attachment.url
    const response = await this.fetchAttachment(primaryUrl)

    if (response.ok) return Buffer.from(await response.arrayBuffer())

    if (primaryUrl !== attachment.url) {
      log.warn(
        { status: response.status },
        `Proxy URL failed for ${attachment.filename}, retrying with direct URL`,
      )
      const fallback = await this.fetchAttachment(attachment.url)
      if (fallback.ok) return Buffer.from(await fallback.arrayBuffer())
    }

    throw new Error(`Failed to download attachment: ${response.status}`)
  }

  /**
   * Process a Discord attachment
   * Downloads from Discord CDN and saves to filesystem
   */
  async processDiscordAttachment(
    attachment: DiscordAttachment,
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment> {
    const attachmentId = uuidv4()
    const timestamp = Date.now()
    const safeFilename = this.sanitizeFilename(attachment.filename)
    const storagePath = `integrations/discord/attachments/${timestamp}_${safeFilename}`

    const result: ProcessedAttachment = {
      id: attachmentId,
      originalUrl: attachment.url,
      storagePath,
      filename: attachment.filename,
      contentType: attachment.content_type || 'application/octet-stream',
      size: attachment.size,
      width: attachment.width,
      height: attachment.height,
      platform: 'discord',
    }

    try {
      const workspacePath = await this.getWorkspacePath(workspaceId)
      const attachmentsDir = this.getAttachmentsDir(workspacePath, 'discord')

      // Ensure directory exists
      await fs.mkdir(attachmentsDir, { recursive: true })

      const buffer = await this.downloadDiscordAttachment(attachment)
      const fullPath = path.join(attachmentsDir, `${timestamp}_${safeFilename}`)

      // Write file
      await fs.writeFile(fullPath, buffer)

      // Write metadata
      const metadata: AttachmentMetadata = {
        id: attachmentId,
        originalUrl: attachment.url,
        filename: attachment.filename,
        contentType: attachment.content_type || 'application/octet-stream',
        size: attachment.size,
        width: attachment.width,
        height: attachment.height,
        platform: 'discord',
        platformId: attachment.id,
        workspaceId,
        createdAt: new Date().toISOString(),
      }
      await fs.writeFile(`${fullPath}.meta.json`, JSON.stringify(metadata, null, 2))

      // Symlink from workspace files folder (best-effort)
      if (agentId) {
        await this.mirrorToWorkspaceFiles(
          fullPath,
          workspacePath,
          agentId,
          attachment.filename,
          'discord',
        )
      }

      log.info(
        { filename: attachment.filename, size: attachment.size },
        'Processed Discord attachment',
      )
    } catch (error) {
      log.error(
        { err: error, filename: attachment.filename },
        'Error processing Discord attachment',
      )
      result.storagePath = undefined
    }

    return result
  }

  /**
   * Process a Slack file
   * Slack requires bot token authentication to download files
   */
  async processSlackFile(
    file: SlackFile,
    botToken: string,
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment> {
    const attachmentId = uuidv4()
    const timestamp = Date.now()
    const safeFilename = this.sanitizeFilename(file.name)
    const storagePath = `integrations/slack/attachments/${timestamp}_${safeFilename}`

    const result: ProcessedAttachment = {
      id: attachmentId,
      originalUrl: file.url_private,
      storagePath,
      filename: file.name,
      contentType: file.mimetype || 'application/octet-stream',
      size: file.size,
      platform: 'slack',
    }

    try {
      const workspacePath = await this.getWorkspacePath(workspaceId)
      const attachmentsDir = this.getAttachmentsDir(workspacePath, 'slack')

      // Ensure directory exists
      await fs.mkdir(attachmentsDir, { recursive: true })

      // Slack requires authentication to download files
      const downloadUrl = file.url_private_download || file.url_private
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${botToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to download Slack file: ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const fullPath = path.join(attachmentsDir, `${timestamp}_${safeFilename}`)

      // Write file
      await fs.writeFile(fullPath, buffer)

      // Write metadata
      const metadata: AttachmentMetadata = {
        id: attachmentId,
        originalUrl: file.url_private,
        filename: file.name,
        contentType: file.mimetype || 'application/octet-stream',
        size: file.size,
        platform: 'slack',
        platformId: file.id,
        workspaceId,
        createdAt: new Date().toISOString(),
      }
      await fs.writeFile(`${fullPath}.meta.json`, JSON.stringify(metadata, null, 2))

      // Symlink from workspace files folder (best-effort)
      if (agentId) {
        await this.mirrorToWorkspaceFiles(fullPath, workspacePath, agentId, file.name, 'slack')
      }

      log.info({ filename: file.name, size: file.size }, 'Processed Slack file')
    } catch (error) {
      log.error({ err: error, filename: file.name }, 'Error processing Slack file')
      result.storagePath = undefined
    }

    return result
  }

  /**
   * Process multiple Discord attachments
   */
  async processDiscordAttachments(
    attachments: DiscordAttachment[],
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment[]> {
    return Promise.all(
      attachments.map((attachment) =>
        this.processDiscordAttachment(attachment, workspaceId, agentId),
      ),
    )
  }

  /**
   * Process multiple Slack files
   */
  async processSlackFiles(
    files: SlackFile[],
    botToken: string,
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment[]> {
    return Promise.all(
      files.map((file) => this.processSlackFile(file, botToken, workspaceId, agentId)),
    )
  }

  /**
   * Build context string for agent execution that describes attachments
   */
  buildAttachmentContext(attachments: ProcessedAttachment[]): string {
    if (attachments.length === 0) {
      return ''
    }

    const lines: string[] = ['\n\nUser also shared the following files:']

    for (const att of attachments) {
      const sizeStr = this.formatFileSize(att.size)
      lines.push(`- ${att.filename} (${att.contentType}, ${sizeStr})`)

      // For images, provide additional context
      if (att.contentType.startsWith('image/')) {
        if (att.width && att.height) {
          lines.push(`  [Image: ${att.width}x${att.height}]`)
        }
      }

      // Always include the storage path so the agent can read the file
      if (att.storagePath) {
        lines.push(`  [Available at: ${att.storagePath}]`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Get file URL for accessing an attachment via the files API
   * Returns the API endpoint path that can be used to read the file
   */
  getFileApiUrl(workspaceId: string, storagePath: string): string {
    const encodedPath = encodeURIComponent(storagePath)
    return `/api/files/workspace/${workspaceId}/read?path=${encodedPath}`
  }

  /**
   * Convert attachment metadata to storage format
   * Uses camelCase to match the ConversationDetector.storeMessage interface
   */
  toStorageFormat(attachments: ProcessedAttachment[]): Array<{
    filename: string
    url: string
    contentType: string
    size: number
    storagePath?: string
  }> {
    return attachments.map((att) => ({
      filename: att.filename,
      url: att.originalUrl,
      contentType: att.contentType,
      size: att.size,
      storagePath: att.storagePath,
    }))
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/__+/g, '_')
      .substring(0, 200) // Limit length
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  /**
   * Check if content type is an image
   */
  isImage(contentType: string): boolean {
    return contentType.startsWith('image/')
  }

  /**
   * Check if content type is a video
   */
  isVideo(contentType: string): boolean {
    return contentType.startsWith('video/')
  }

  /**
   * Check if content type is audio
   */
  isAudio(contentType: string): boolean {
    return contentType.startsWith('audio/')
  }
}

// Export singleton instance
export const attachmentProcessor: IAttachmentProcessor = new AttachmentProcessor()
