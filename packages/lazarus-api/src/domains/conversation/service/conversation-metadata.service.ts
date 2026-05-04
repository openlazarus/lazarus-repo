import * as path from 'path'
import * as fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

import type { Dirent } from 'fs'
import type {
  ConversationMetadata,
  ConversationsIndex,
} from '@domains/conversation/types/conversation.types'
import type { IConversationMetadataService } from './conversation-metadata.service.interface'
import { STORAGE_BASE_PATH } from '@infrastructure/config/storage'
import { createLogger } from '@utils/logger'
const log = createLogger('conversation-metadata')

export class ConversationMetadataService implements IConversationMetadataService {
  private basePath: string

  constructor() {
    // Must match STORAGE_BASE_PATH (e.g. /Users/you/storage or /mnt/sdc/storage), not ./storage —
    // dev used to point at cwd-relative ./storage while transcripts used env, breaking lookups.
    this.basePath = STORAGE_BASE_PATH
  }

  /**
   * Get .meta directory for a workspace
   */
  private getMetaDir(userId?: string, workspaceId?: string): string {
    const workspace = workspaceId || 'default'

    if (userId) {
      return path.join(this.basePath, 'users', userId, 'workspaces', workspace, '.meta')
    }

    return path.join(this.basePath, 'workspaces', workspace, '.meta')
  }

  /**
   * Get path to conversations.json index file
   */
  private getIndexPath(userId?: string, workspaceId?: string): string {
    return path.join(this.getMetaDir(userId, workspaceId), 'conversations.json')
  }

  /**
   * Get path to individual conversation metadata file
   */
  private getConversationPath(
    conversationId: string,
    userId?: string,
    workspaceId?: string,
  ): string {
    return path.join(
      this.getMetaDir(userId, workspaceId),
      'conversations',
      `${conversationId}.json`,
    )
  }

  /**
   * Initialize .meta directory structure
   */
  private async initialize(userId?: string, workspaceId?: string): Promise<void> {
    const metaDir = this.getMetaDir(userId, workspaceId)
    const conversationsDir = path.join(metaDir, 'conversations')
    const indexPath = this.getIndexPath(userId, workspaceId)

    // Create directories
    await fs.mkdir(conversationsDir, { recursive: true })

    // Initialize conversations.json if it doesn't exist
    try {
      await fs.access(indexPath)
    } catch {
      await fs.writeFile(indexPath, JSON.stringify({}, null, 2))
    }
  }

  /**
   * Read conversations index
   */
  private async readIndex(userId?: string, workspaceId?: string): Promise<ConversationsIndex> {
    try {
      const indexPath = this.getIndexPath(userId, workspaceId)
      const data = await fs.readFile(indexPath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  /**
   * Write conversations index
   */
  private async writeIndex(
    index: ConversationsIndex,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    const indexPath = this.getIndexPath(userId, workspaceId)
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2))
  }

  /**
   * Link a Claude SDK session to a conversation
   * Creates a new conversation if one doesn't exist for this session
   */
  async linkSessionToConversation(params: {
    sessionId: string
    workspaceId: string
    userId?: string
    agentId?: string | null
    agentName?: string
    title?: string
    messageCount?: number
  }): Promise<string> {
    const { sessionId, workspaceId, userId, agentId, agentName, title, messageCount } = params

    await this.initialize(userId, workspaceId)

    // Check if conversation already exists for this session
    const index = await this.readIndex(userId, workspaceId)
    const existing = Object.values(index).find((conv) => conv.sessionId === sessionId)

    if (existing) {
      // Update existing conversation
      existing.lastActivity = new Date().toISOString()
      if (messageCount !== undefined) {
        existing.messageCount = messageCount
      }
      if (title) {
        existing.title = title
      }

      index[existing.id] = existing
      await this.writeIndex(index, userId, workspaceId)

      // Update individual conversation file
      const convPath = this.getConversationPath(existing.id, userId, workspaceId)
      await fs.writeFile(convPath, JSON.stringify(existing, null, 2))

      return existing.id
    }

    // Create new conversation
    const conversationId = uuidv4()
    const now = new Date().toISOString()

    const conversation: ConversationMetadata = {
      id: conversationId,
      sessionId,
      workspaceId,
      userId,
      agentId: agentId !== undefined ? agentId : null,
      agentName: agentName || 'Lazarus',
      title: title || 'New Conversation',
      createdAt: now,
      lastActivity: now,
      messageCount: messageCount || 0,
      labels: [],
    }

    // Add to index
    index[conversationId] = conversation
    await this.writeIndex(index, userId, workspaceId)

    // Write individual conversation file
    const convPath = this.getConversationPath(conversationId, userId, workspaceId)
    await fs.writeFile(convPath, JSON.stringify(conversation, null, 2))

    return conversationId
  }

  /**
   * List all conversations for a workspace
   */
  async listConversations(workspaceId: string, userId?: string): Promise<ConversationMetadata[]> {
    await this.initialize(userId, workspaceId)
    const index = await this.readIndex(userId, workspaceId)

    // Return as array, sorted by lastActivity (newest first)
    return Object.values(index).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
    )
  }

  /**
   * Read conversation metadata for one workspace (file, then index).
   */
  private async readConversationInWorkspace(
    conversationId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<ConversationMetadata | null> {
    try {
      const convPath = this.getConversationPath(conversationId, userId, workspaceId)
      const data = await fs.readFile(convPath, 'utf-8')
      return JSON.parse(data)
    } catch {
      const index = await this.readIndex(userId, workspaceId)
      return index[conversationId] || null
    }
  }

  /**
   * If header/query workspace does not match where metadata was written, search all of this user's workspaces.
   */
  private async findConversationAcrossUserWorkspaces(
    conversationId: string,
    userId: string,
    excludeWorkspaceId?: string,
  ): Promise<ConversationMetadata | null> {
    const root = path.join(this.basePath, 'users', userId, 'workspaces')
    let entries: Dirent[]
    try {
      entries = await fs.readdir(root, { withFileTypes: true })
    } catch (err) {
      log.debug({ err, root }, 'Could not list user workspaces for conversation fallback')
      return null
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue
      const ws = e.name
      if (excludeWorkspaceId !== undefined && ws === excludeWorkspaceId) continue
      const found = await this.readConversationInWorkspace(conversationId, userId, ws)
      if (found) {
        log.info(
          { conversationId, resolvedWorkspaceId: ws },
          'Resolved conversation via cross-workspace metadata lookup',
        )
        return found
      }
    }
    return null
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(
    conversationId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<ConversationMetadata | null> {
    const primary = await this.readConversationInWorkspace(conversationId, userId, workspaceId)
    if (primary) return primary

    if (!userId) return null

    return this.findConversationAcrossUserWorkspaces(conversationId, userId, workspaceId)
  }

  /**
   * Update conversation metadata
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<ConversationMetadata>,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    const index = await this.readIndex(userId, workspaceId)
    const conversation = index[conversationId]

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Update conversation
    const updated: ConversationMetadata = {
      ...conversation,
      ...updates,
      id: conversation.id, // Don't allow changing ID
      sessionId: conversation.sessionId, // Don't allow changing sessionId
      lastActivity: new Date().toISOString(),
    }

    // Update index
    index[conversationId] = updated
    await this.writeIndex(index, userId, workspaceId)

    // Update individual file
    const convPath = this.getConversationPath(conversationId, userId, workspaceId)
    await fs.writeFile(convPath, JSON.stringify(updated, null, 2))
  }

  /**
   * Update a conversation's SDK session_id. Used when the SDK rotates session_id
   * on resume — we want the conversation to continue tracking the live transcript.
   */
  async updateSessionId(
    conversationId: string,
    newSessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    const index = await this.readIndex(userId, workspaceId)
    const conversation = index[conversationId]
    if (!conversation) return

    const updated: ConversationMetadata = {
      ...conversation,
      sessionId: newSessionId,
      lastActivity: new Date().toISOString(),
    }
    index[conversationId] = updated
    await this.writeIndex(index, userId, workspaceId)

    const convPath = this.getConversationPath(conversationId, userId, workspaceId)
    await fs.writeFile(convPath, JSON.stringify(updated, null, 2))
  }

  /**
   * Delete a conversation
   * Note: This only deletes metadata, not the SDK session transcript
   */
  async deleteConversation(
    conversationId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    // Remove from index
    const index = await this.readIndex(userId, workspaceId)
    delete index[conversationId]
    await this.writeIndex(index, userId, workspaceId)

    // Delete individual file
    try {
      const convPath = this.getConversationPath(conversationId, userId, workspaceId)
      await fs.unlink(convPath)
    } catch (error) {
      // File might not exist, that's okay
      log.warn(`Could not delete conversation file: ${error}`)
    }
  }

  /**
   * Find conversation by session ID
   */
  async findBySessionId(
    sessionId: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<ConversationMetadata | null> {
    const index = await this.readIndex(userId, workspaceId)
    let conversation = Object.values(index).find((conv) => conv.sessionId === sessionId)
    if (conversation) return conversation

    if (!userId) return null

    const root = path.join(this.basePath, 'users', userId, 'workspaces')
    let entries: Dirent[]
    try {
      entries = await fs.readdir(root, { withFileTypes: true })
    } catch {
      return null
    }

    for (const e of entries) {
      if (!e.isDirectory()) continue
      const ws = e.name
      if (workspaceId !== undefined && ws === workspaceId) continue
      const idx = await this.readIndex(userId, ws)
      conversation = Object.values(idx).find((conv) => conv.sessionId === sessionId)
      if (conversation) {
        log.info(
          { sessionId, resolvedWorkspaceId: ws },
          'Resolved session via cross-workspace metadata lookup',
        )
        return conversation
      }
    }
    return null
  }

  /**
   * Increment message count for a conversation by session ID
   */
  async incrementMessageCount(
    sessionId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<void> {
    try {
      const index = await this.readIndex(userId, workspaceId)
      const conversation = Object.values(index).find((conv) => conv.sessionId === sessionId)

      if (conversation) {
        conversation.messageCount = (conversation.messageCount || 0) + 1
        conversation.lastActivity = new Date().toISOString()

        // Update index
        index[conversation.id] = conversation
        await this.writeIndex(index, userId, workspaceId)

        // Update individual file
        const convPath = this.getConversationPath(conversation.id, userId, workspaceId)
        await fs.writeFile(convPath, JSON.stringify(conversation, null, 2))
      }
    } catch (error) {
      log.warn(`Could not increment message count: ${error}`)
    }
  }

  /**
   * Get unanalyzed conversations for librarian processing
   */
  async getUnanalyzedConversations(
    workspaceId: string,
    userId?: string,
    minMessageCount: number = 2,
  ): Promise<ConversationMetadata[]> {
    await this.initialize(userId, workspaceId)
    const index = await this.readIndex(userId, workspaceId)

    return Object.values(index).filter(
      (conv) => !conv.librarian?.analyzed && conv.messageCount >= minMessageCount,
    )
  }

  /**
   * Mark conversation as analyzed by librarian
   */
  async markAsAnalyzed(
    conversationId: string,
    artifactsCreated: string[],
    artifactsUpdated: string[],
    userId?: string,
    workspaceId?: string,
  ): Promise<void> {
    const index = await this.readIndex(userId, workspaceId)
    const conversation = index[conversationId]

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Update librarian metadata
    conversation.librarian = {
      analyzed: true,
      analyzedAt: new Date().toISOString(),
      artifactsCreated,
      artifactsUpdated,
    }

    // Update index
    index[conversationId] = conversation
    await this.writeIndex(index, userId, workspaceId)

    // Update individual file
    const convPath = this.getConversationPath(conversationId, userId, workspaceId)
    await fs.writeFile(convPath, JSON.stringify(conversation, null, 2))
  }
}

// Export singleton instance
export const conversationMetadata: IConversationMetadataService = new ConversationMetadataService()
