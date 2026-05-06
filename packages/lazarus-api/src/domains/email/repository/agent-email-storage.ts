import * as fs from 'fs/promises'
import * as path from 'path'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import type { IAttachmentDestination, AttachmentContext } from '@domains/email/types/email.types'
import {
  AgentMessageAttachmentDestination,
  WorkspaceFilesAttachmentDestination,
} from '@domains/email/service/attachment-destinations'
import type { IAgentEmailStorage } from './agent-email-storage.interface'
import { createLogger } from '@utils/logger'

const log = createLogger('agent-email-storage')

export interface AgentEmail {
  id: string // messageId from email service
  agentId: string
  workspaceId: string
  userId: string
  sender: string
  subject: string
  date: string
  textContent?: string
  htmlContent?: string
  inReplyTo?: string
  references?: string[]
  emailMessageId?: string
  attachments: AgentEmailAttachment[]
  metadata: {
    received: string
    read: boolean
    archived: boolean
  }
  triggerEvent: string // 'email_received', etc.
}

export interface AgentEmailAttachment {
  filename: string
  contentType: string
  size: number
  storagePath: string // Relative path within workspace
}

export interface EmailWebhookPayload {
  trigger_event: string
  project: {
    identifier: string
    name: string
    domain: string
  }
  email: {
    message_id: string
    sender: string
    subject: string
    date: string
    text_content?: string
    html_content?: string
  }
  attachments: Array<{
    filename: string
    content_type: string
    size: number
    storage_path: string
    content_base64: string
  }>
}

export interface EmailFilter {
  unreadOnly?: boolean
  from?: string
  subject?: string
  limit?: number
  offset?: number
}

/**
 * Service for managing agent email storage
 * Stores emails in agent's inbox directory within workspace
 */
export class AgentEmailStorage implements IAgentEmailStorage {
  private readonly attachmentDestinations: IAttachmentDestination[]

  constructor(_baseStoragePath?: string, attachmentDestinations?: IAttachmentDestination[]) {
    this.attachmentDestinations = attachmentDestinations || [
      new AgentMessageAttachmentDestination('inbox'),
      new WorkspaceFilesAttachmentDestination(),
    ]
  }

  /**
   * Get the workspace filesystem path
   * Queries database for settings.path, falls back to workspaces directory
   */
  private async getWorkspacePath(workspaceId: string): Promise<string> {
    return resolveWorkspacePath(workspaceId)
  }

  /**
   * Get the inbox directory path for an agent
   * Uses workspace-centric storage path
   */
  private async getInboxPath(workspaceId: string, agentId: string): Promise<string> {
    const workspacePath = await this.getWorkspacePath(workspaceId)
    return path.join(workspacePath, '.agents', agentId, 'inbox')
  }

  /**
   * Get the message directory path (contains content.json and attachments)
   */
  private async getMessagePath(
    workspaceId: string,
    agentId: string,
    messageId: string,
  ): Promise<string> {
    const inboxPath = await this.getInboxPath(workspaceId, agentId)
    return path.join(inboxPath, messageId)
  }

  /**
   * Ensure inbox directories exist
   */
  private async ensureInboxExists(workspaceId: string, agentId: string): Promise<void> {
    const inboxPath = await this.getInboxPath(workspaceId, agentId)
    await fs.mkdir(inboxPath, { recursive: true })
  }

  /**
   * Ensure message directory exists
   */
  private async ensureMessageDirExists(
    workspaceId: string,
    agentId: string,
    messageId: string,
  ): Promise<void> {
    const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
    await fs.mkdir(messagePath, { recursive: true })
  }

  /**
   * Save an incoming email to agent's inbox
   * @param agentId - Agent ID
   * @param workspaceId - Workspace ID
   * @param emailData - Email webhook payload
   */
  async saveIncomingEmail(
    agentId: string,
    workspaceId: string,
    emailData: EmailWebhookPayload,
  ): Promise<AgentEmail> {
    try {
      await this.ensureInboxExists(workspaceId, agentId)
      await this.ensureMessageDirExists(workspaceId, agentId, emailData.email.message_id)

      // Save attachments first
      const savedAttachments: AgentEmailAttachment[] = []

      if (emailData.attachments && emailData.attachments.length > 0) {
        for (const attachment of emailData.attachments) {
          const savedAttachment = await this.saveAttachment(
            workspaceId,
            agentId,
            emailData.email.message_id,
            attachment,
          )
          savedAttachments.push(savedAttachment)
        }
      }

      // Create email record
      const email: AgentEmail = {
        id: emailData.email.message_id,
        agentId,
        workspaceId,
        userId: workspaceId, // Use workspaceId for compatibility
        sender: emailData.email.sender,
        subject: emailData.email.subject,
        date: emailData.email.date,
        textContent: emailData.email.text_content,
        htmlContent: emailData.email.html_content,
        attachments: savedAttachments,
        metadata: {
          received: new Date().toISOString(),
          read: false,
          archived: false,
        },
        triggerEvent: emailData.trigger_event,
      }

      // Save email content to content.json in message directory
      const messagePath = await this.getMessagePath(
        workspaceId,
        agentId,
        emailData.email.message_id,
      )
      const emailFilePath = path.join(messagePath, 'content.json')

      await fs.writeFile(emailFilePath, JSON.stringify(email, null, 2), 'utf-8')

      log.info({ emailId: email.id, agentId, emailFilePath }, 'Saved email')

      return email
    } catch (error) {
      log.error({ err: error }, 'Failed to save email')
      throw new Error(`Failed to save email for agent ${agentId}: ${error}`)
    }
  }

  /**
   * Save an email attachment to all registered destinations.
   *
   * Each destination is independent — a failure in a secondary destination
   * (e.g. workspace files mirror) is logged but does not block the primary save.
   */
  private async saveAttachment(
    workspaceId: string,
    agentId: string,
    messageId: string,
    attachment: {
      filename: string
      content_type: string
      size: number
      storage_path: string
      content_base64: string
    },
  ): Promise<AgentEmailAttachment> {
    try {
      const workspacePath = await this.getWorkspacePath(workspaceId)
      const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      const buffer = Buffer.from(attachment.content_base64, 'base64')

      const ctx: AttachmentContext = {
        workspaceId,
        agentId,
        messageId,
        filename: attachment.filename,
        safeFilename,
        contentType: attachment.content_type,
        size: attachment.size,
        workspacePath,
        platform: 'email',
      }

      // Run all destinations — first is primary, rest are best-effort
      for (let i = 0; i < this.attachmentDestinations.length; i++) {
        const dest = this.attachmentDestinations[i]!
        try {
          await dest.save(ctx, buffer)
        } catch (err) {
          if (i === 0) throw err // primary destination failure is fatal
          log.error(
            { err, destination: dest.name, filename: attachment.filename },
            'Secondary destination failed',
          )
        }
      }

      // Return metadata using inbox-relative path (primary destination)
      const relativeStoragePath = path.join('inbox', messageId, safeFilename)

      return {
        filename: attachment.filename,
        contentType: attachment.content_type,
        size: attachment.size,
        storagePath: relativeStoragePath,
      }
    } catch (error) {
      log.error({ err: error, filename: attachment.filename }, 'Failed to save attachment')
      throw new Error(`Failed to save attachment: ${error}`)
    }
  }

  /**
   * Get a single email by ID
   * @param agentId - Agent ID
   * @param workspaceId - Workspace ID
   * @param messageId - Message ID
   */
  async getEmail(
    agentId: string,
    workspaceId: string,
    messageId: string,
  ): Promise<AgentEmail | null> {
    try {
      const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
      const emailFilePath = path.join(messagePath, 'content.json')

      try {
        const content = await fs.readFile(emailFilePath, 'utf-8')
        return JSON.parse(content) as AgentEmail
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return null
        }
        throw error
      }
    } catch (error) {
      log.error({ err: error, messageId }, 'Failed to get email')
      throw new Error(`Failed to get email: ${error}`)
    }
  }

  /**
   * List emails in agent's inbox
   * @param agentId - Agent ID
   * @param workspaceId - Workspace ID
   * @param filter - Optional filter
   */
  async listEmails(
    agentId: string,
    workspaceId: string,
    filter?: EmailFilter,
  ): Promise<AgentEmail[]> {
    try {
      const inboxPath = await this.getInboxPath(workspaceId, agentId)

      // Check if inbox exists
      try {
        await fs.access(inboxPath)
      } catch (error) {
        // Inbox doesn't exist yet, return empty array
        return []
      }

      // Read all directories in inbox (each directory is an email)
      const entries = await fs.readdir(inboxPath, { withFileTypes: true })
      const emailDirs = entries.filter((entry) => entry.isDirectory())

      const emails: AgentEmail[] = []

      for (const dir of emailDirs) {
        try {
          const contentPath = path.join(inboxPath, dir.name, 'content.json')
          const content = await fs.readFile(contentPath, 'utf-8')
          const email: AgentEmail = JSON.parse(content)

          // Apply filters
          if (filter) {
            if (filter.unreadOnly && email.metadata.read) continue
            if (filter.from && !email.sender.includes(filter.from)) continue
            if (
              filter.subject &&
              !email.subject.toLowerCase().includes(filter.subject.toLowerCase())
            )
              continue
          }

          emails.push(email)
        } catch (error) {
          log.error({ err: error, directory: dir.name }, 'Failed to read email directory')
          // Skip invalid directories
        }
      }

      // Sort by date (newest first)
      emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Apply pagination
      const offset = filter?.offset || 0
      const limit = filter?.limit || emails.length

      return emails.slice(offset, offset + limit)
    } catch (error) {
      log.error({ err: error }, 'Failed to list emails')
      throw new Error(`Failed to list emails for agent ${agentId}: ${error}`)
    }
  }

  /**
   * Mark an email as read
   * @param agentId - Agent ID
   * @param workspaceId - Workspace ID
   * @param messageId - Message ID
   */
  async markAsRead(agentId: string, workspaceId: string, messageId: string): Promise<void> {
    try {
      const email = await this.getEmail(agentId, workspaceId, messageId)

      if (email) {
        email.metadata.read = true

        const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
        const emailFilePath = path.join(messagePath, 'content.json')

        await fs.writeFile(emailFilePath, JSON.stringify(email, null, 2), 'utf-8')
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to mark email as read')
      throw new Error(`Failed to mark email as read: ${error}`)
    }
  }

  /**
   * Get attachment content
   * @param agentId - Agent ID
   * @param workspaceId - Workspace ID
   * @param storagePath - Relative path to attachment
   */
  async getAttachment(
    agentId: string,
    workspaceId: string,
    storagePath: string,
  ): Promise<Buffer | null> {
    try {
      const workspacePath = await this.getWorkspacePath(workspaceId)
      const agentBasePath = path.join(workspacePath, '.agents', agentId)
      const attachmentPath = path.join(agentBasePath, storagePath)

      try {
        return await fs.readFile(attachmentPath)
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return null
        }
        throw error
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to get attachment')
      throw new Error(`Failed to get attachment: ${error}`)
    }
  }

  /**
   * Delete an email and its attachments
   * @param agentId - Agent ID
   * @param workspaceId - Workspace ID
   * @param messageId - Message ID
   */
  async deleteEmail(agentId: string, workspaceId: string, messageId: string): Promise<void> {
    try {
      const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)

      // Delete entire message directory (content.json and all attachments)
      try {
        await fs.rm(messagePath, { recursive: true, force: true })
        log.info({ messageId }, 'Deleted email and all attachments')
      } catch (error) {
        log.error({ err: error, messagePath }, 'Failed to delete message directory')
        throw error
      }
    } catch (error) {
      log.error({ err: error }, 'Failed to delete email')
      throw new Error(`Failed to delete email: ${error}`)
    }
  }
}

// Export singleton instance
export const agentEmailStorage: IAgentEmailStorage = new AgentEmailStorage()
