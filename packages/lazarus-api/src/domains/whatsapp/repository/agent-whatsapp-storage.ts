import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import type { IAttachmentDestination, AttachmentContext } from '../../email/types/email.types'
import {
  AgentMessageAttachmentDestination,
  WorkspaceFilesAttachmentDestination,
} from '@domains/email/service/attachment-destinations'
import type { IAgentWhatsAppStorage } from './agent-whatsapp-storage.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('agent-whatsapp-storage')

export interface WhatsAppMessage {
  id: string // WhatsApp message ID (wamid.xxx)
  agentId: string
  workspaceId: string
  userId: string
  sender: string // Phone number
  senderName?: string
  recipient: string // Phone number
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'sticker'
  textContent?: string
  transcription?: string
  media?: WhatsAppMedia
  location?: WhatsAppLocation
  contacts?: WhatsAppContact[]
  metadata: {
    received: string
    read: boolean
    conversationId?: string
    direction: 'inbound' | 'outbound'
  }
  triggerEvent: string
}

export interface WhatsAppMedia {
  id: string // Kapso media ID
  mimeType: string
  filename?: string
  caption?: string
  storagePath: string // Relative path within agent's whatsapp directory
  size?: number
}

export interface WhatsAppLocation {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface WhatsAppContact {
  name: string
  phones: { phone: string; type?: string }[]
}

export interface WhatsAppMessageFilter {
  unreadOnly?: boolean
  from?: string
  /** Filter by contact phone — matches both inbound sender and outbound recipient */
  contact?: string
  direction?: 'inbound' | 'outbound'
  type?: WhatsAppMessage['type']
  /** Only include messages after this timestamp (ISO string or epoch ms) */
  since?: string | number
  limit?: number
  offset?: number
}

/**
 * Service for managing agent WhatsApp message storage
 * Stores messages in agent's whatsapp directory within workspace
 */
export class AgentWhatsAppStorage implements IAgentWhatsAppStorage {
  private readonly attachmentDestinations: IAttachmentDestination[]

  constructor(_baseStoragePath?: string, attachmentDestinations?: IAttachmentDestination[]) {
    this.attachmentDestinations = attachmentDestinations || [
      new AgentMessageAttachmentDestination('whatsapp'),
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
   * Get the WhatsApp inbox directory path for an agent
   */
  private async getWhatsAppPath(workspaceId: string, agentId: string): Promise<string> {
    const workspacePath = await this.getWorkspacePath(workspaceId)
    return path.join(workspacePath, '.agents', agentId, 'whatsapp')
  }

  /**
   * Get the message directory path (contains content.json and media files)
   */
  private async getMessagePath(
    workspaceId: string,
    agentId: string,
    messageId: string,
  ): Promise<string> {
    const whatsappPath = await this.getWhatsAppPath(workspaceId, agentId)
    return path.join(whatsappPath, messageId)
  }

  /**
   * Get the sent messages directory path
   */
  private async getSentPath(workspaceId: string, agentId: string): Promise<string> {
    const whatsappPath = await this.getWhatsAppPath(workspaceId, agentId)
    return path.join(whatsappPath, 'sent')
  }

  /**
   * Ensure WhatsApp directories exist
   */
  private async ensureWhatsAppDirExists(workspaceId: string, agentId: string): Promise<void> {
    const whatsappPath = await this.getWhatsAppPath(workspaceId, agentId)
    await fs.mkdir(whatsappPath, { recursive: true })

    const sentPath = await this.getSentPath(workspaceId, agentId)
    await fs.mkdir(sentPath, { recursive: true })
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
   * Save an incoming WhatsApp message to agent's whatsapp directory
   */
  async saveIncomingMessage(
    agentId: string,
    workspaceId: string,
    message: Omit<WhatsAppMessage, 'id' | 'agentId' | 'workspaceId' | 'triggerEvent'> & {
      id?: string
    },
  ): Promise<WhatsAppMessage> {
    try {
      await this.ensureWhatsAppDirExists(workspaceId, agentId)

      const messageId = message.id || `wamid_${uuidv4().replace(/-/g, '')}`
      await this.ensureMessageDirExists(workspaceId, agentId, messageId)

      const fullMessage: WhatsAppMessage = {
        ...message,
        id: messageId,
        agentId,
        workspaceId,
        metadata: {
          ...message.metadata,
          received: new Date().toISOString(),
          direction: 'inbound',
        },
        triggerEvent: 'whatsapp_message_received',
      }

      // Save message content
      const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
      const contentFilePath = path.join(messagePath, 'content.json')

      await fs.writeFile(contentFilePath, JSON.stringify(fullMessage, null, 2), 'utf-8')

      log.info(`Saved WhatsApp message ${messageId} for agent ${agentId}`)

      return fullMessage
    } catch (error) {
      log.error({ err: error }, `Failed to save WhatsApp message:`)
      throw new Error(`Failed to save WhatsApp message for agent ${agentId}: ${error}`)
    }
  }

  /**
   * Save media attachment to all registered destinations.
   *
   * Primary destination (agent message dir) failure is fatal.
   * Secondary destinations (workspace files mirror) are best-effort.
   */
  async saveMediaAttachment(
    agentId: string,
    workspaceId: string,
    messageId: string,
    filename: string,
    content: Buffer,
    contentType?: string,
  ): Promise<string> {
    try {
      const workspacePath = await this.getWorkspacePath(workspaceId)
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

      const ctx: AttachmentContext = {
        workspaceId,
        agentId,
        messageId,
        filename,
        safeFilename,
        contentType: contentType || 'application/octet-stream',
        size: content.length,
        workspacePath,
        platform: 'whatsapp',
      }

      // Run all destinations — first is primary, rest are best-effort
      for (let i = 0; i < this.attachmentDestinations.length; i++) {
        const dest = this.attachmentDestinations[i]!
        try {
          await dest.save(ctx, content)
        } catch (err) {
          if (i === 0) throw err // primary destination failure is fatal
          log.error({ err: err }, `Secondary destination "${dest.name}" failed for ${filename}:`)
        }
      }

      // Return relative path from agent's whatsapp directory (primary destination)
      return path.join(messageId, safeFilename)
    } catch (error) {
      log.error({ err: error }, `Failed to save media attachment:`)
      throw new Error(`Failed to save media attachment: ${error}`)
    }
  }

  /**
   * Save an outbound message record
   */
  async saveOutboundMessage(
    agentId: string,
    workspaceId: string,
    message: Omit<
      WhatsAppMessage,
      'id' | 'triggerEvent' | 'metadata' | 'workspaceId' | 'agentId'
    > & {
      id?: string
      metadata?: Partial<WhatsAppMessage['metadata']>
    },
  ): Promise<WhatsAppMessage> {
    try {
      await this.ensureWhatsAppDirExists(workspaceId, agentId)

      const messageId = message.id || `sent_${uuidv4().replace(/-/g, '')}`
      const sentPath = await this.getSentPath(workspaceId, agentId)

      const fullMessage: WhatsAppMessage = {
        ...message,
        id: messageId,
        agentId,
        workspaceId,
        metadata: {
          received: new Date().toISOString(),
          read: true,
          direction: 'outbound',
          ...message.metadata,
        },
        triggerEvent: 'whatsapp_message_sent',
      }

      const filePath = path.join(sentPath, `${messageId}.json`)
      await fs.writeFile(filePath, JSON.stringify(fullMessage, null, 2), 'utf-8')

      log.info(`Saved outbound WhatsApp message ${messageId}`)

      return fullMessage
    } catch (error) {
      log.error({ err: error }, `Failed to save outbound message:`)
      throw new Error(`Failed to save outbound message: ${error}`)
    }
  }

  /**
   * Get a single WhatsApp message by ID
   */
  async getMessage(
    agentId: string,
    workspaceId: string,
    messageId: string,
  ): Promise<WhatsAppMessage | null> {
    try {
      // Try inbound message first
      const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
      const contentPath = path.join(messagePath, 'content.json')

      try {
        const content = await fs.readFile(contentPath, 'utf-8')
        return JSON.parse(content) as WhatsAppMessage
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }

      // Try sent message
      const sentPath = await this.getSentPath(workspaceId, agentId)
      const sentFilePath = path.join(sentPath, `${messageId}.json`)

      try {
        const content = await fs.readFile(sentFilePath, 'utf-8')
        return JSON.parse(content) as WhatsAppMessage
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return null
        }
        throw error
      }
    } catch (error) {
      log.error({ err: error }, `Failed to get message ${messageId}:`)
      throw new Error(`Failed to get message: ${error}`)
    }
  }

  /**
   * List WhatsApp messages for an agent
   */
  async listMessages(
    agentId: string,
    workspaceId: string,
    filter?: WhatsAppMessageFilter,
  ): Promise<WhatsAppMessage[]> {
    try {
      const whatsappPath = await this.getWhatsAppPath(workspaceId, agentId)
      const messages: WhatsAppMessage[] = []

      // Check if directory exists
      try {
        await fs.access(whatsappPath)
      } catch (error) {
        return []
      }

      // Read inbound messages
      const entries = await fs.readdir(whatsappPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'sent') {
          try {
            const contentPath = path.join(whatsappPath, entry.name, 'content.json')
            const content = await fs.readFile(contentPath, 'utf-8')
            const message: WhatsAppMessage = JSON.parse(content)

            // Apply filters
            if (this.messageMatchesFilter(message, filter)) {
              messages.push(message)
            }
          } catch (error) {
            log.debug({ err: error }, 'Skip invalid message directories')
          }
        }
      }

      // Include outbound messages if direction filter allows
      if (!filter?.direction || filter.direction === 'outbound') {
        const sentPath = await this.getSentPath(workspaceId, agentId)
        try {
          const sentFiles = await fs.readdir(sentPath)
          for (const file of sentFiles) {
            if (file.endsWith('.json')) {
              try {
                const content = await fs.readFile(path.join(sentPath, file), 'utf-8')
                const message: WhatsAppMessage = JSON.parse(content)
                if (this.messageMatchesFilter(message, filter)) {
                  messages.push(message)
                }
              } catch (error) {
                log.debug({ err: error }, 'Skip invalid files')
              }
            }
          }
        } catch (error) {
          log.debug({ err: error }, 'Sent directory may not exist')
        }
      }

      // Sort by timestamp (newest first)
      messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // Apply pagination
      const offset = filter?.offset || 0
      const limit = filter?.limit || messages.length

      return messages.slice(offset, offset + limit)
    } catch (error) {
      log.error({ err: error }, `Failed to list messages:`)
      throw new Error(`Failed to list messages for agent ${agentId}: ${error}`)
    }
  }

  /**
   * Check if a message matches the filter.
   * Each check maps a filter field to a boolean predicate on the message.
   */
  private messageMatchesFilter(message: WhatsAppMessage, filter?: WhatsAppMessageFilter): boolean {
    if (!filter) return true

    const checks: Array<() => boolean> = [
      () => !filter.unreadOnly || !message.metadata.read,
      () => !filter.from || message.sender.includes(filter.from),
      () =>
        !filter.contact ||
        message.sender.includes(filter.contact) ||
        message.recipient.includes(filter.contact),
      () => !filter.direction || message.metadata.direction === filter.direction,
      () => !filter.type || message.type === filter.type,
      () =>
        !filter.since ||
        new Date(message.timestamp).getTime() >=
          (typeof filter.since === 'number' ? filter.since : new Date(filter.since).getTime()),
    ]

    return checks.every((check) => check())
  }

  /**
   * Mark a message as read
   */
  async markAsRead(agentId: string, workspaceId: string, messageId: string): Promise<void> {
    try {
      const message = await this.getMessage(agentId, workspaceId, messageId)

      if (message) {
        message.metadata.read = true

        if (message.metadata.direction === 'inbound') {
          const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
          const contentPath = path.join(messagePath, 'content.json')
          await fs.writeFile(contentPath, JSON.stringify(message, null, 2), 'utf-8')
        } else {
          const sentPath = await this.getSentPath(workspaceId, agentId)
          const filePath = path.join(sentPath, `${messageId}.json`)
          await fs.writeFile(filePath, JSON.stringify(message, null, 2), 'utf-8')
        }
      }
    } catch (error) {
      log.error({ err: error }, `Failed to mark message as read:`)
      throw new Error(`Failed to mark message as read: ${error}`)
    }
  }

  /**
   * Get media attachment content
   */
  async getMediaAttachment(
    agentId: string,
    workspaceId: string,
    storagePath: string,
  ): Promise<Buffer | null> {
    try {
      const whatsappPath = await this.getWhatsAppPath(workspaceId, agentId)
      const fullPath = path.join(whatsappPath, storagePath)

      try {
        return await fs.readFile(fullPath)
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return null
        }
        throw error
      }
    } catch (error) {
      log.error({ err: error }, `Failed to get media attachment:`)
      throw new Error(`Failed to get media attachment: ${error}`)
    }
  }

  /**
   * Delete a WhatsApp message and its media
   */
  async deleteMessage(agentId: string, workspaceId: string, messageId: string): Promise<void> {
    try {
      // Try to delete inbound message directory
      const messagePath = await this.getMessagePath(workspaceId, agentId, messageId)
      try {
        await fs.rm(messagePath, { recursive: true, force: true })
        log.info(`Deleted inbound message ${messageId}`)
        return
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }

      // Try to delete sent message
      const sentPath = await this.getSentPath(workspaceId, agentId)
      const sentFilePath = path.join(sentPath, `${messageId}.json`)
      try {
        await fs.unlink(sentFilePath)
        log.info(`Deleted sent message ${messageId}`)
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
    } catch (error) {
      log.error({ err: error }, `Failed to delete message:`)
      throw new Error(`Failed to delete message: ${error}`)
    }
  }
}

// Export singleton instance
export const agentWhatsAppStorage: IAgentWhatsAppStorage = new AgentWhatsAppStorage()
