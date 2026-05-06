/**
 * Discord Integration Service
 *
 * Manages Discord connections and message handling for Lazarus workspaces.
 * Uses discord.js for gateway communication and Supabase for persistence.
 */

import type { Json } from '@infrastructure/database/database.types'
import { discordRepository } from '@domains/discord/repository/discord.repository'
import type {
  ConversationContext,
  ProcessedAttachment,
} from '../../integration/types/integration.types'
import { conversationDetector } from '@domains/integration/service/conversation-detector'
import { attachmentProcessor } from '@domains/integration/service/attachment-processor'
import { WorkspaceAgentExecutor } from '@domains/agent/service/workspace-agent-executor'
import { creditsGuard, INSUFFICIENT_CREDITS_MESSAGE } from '@shared/services/credits-guard'
import { executionQueue } from '@domains/execution/service/execution-queue'
import { memoryPressureMonitor } from '@domains/chat/service/memory-pressure-monitor'
import { generateConversationTitle } from '@domains/conversation/service/conversation-title.service'
import { MAX_TURNS } from '@infrastructure/config/max-turns'
import { v4 as uuidv4 } from 'uuid'
import type {
  CreateConnectionOptions,
  DiscordConnection,
  DiscordConnectionSettings,
  DiscordExecutionContext,
  DiscordMessage,
} from '@domains/discord/types/discord.types'
import type { IDiscordService } from './discord.service.interface'
import type { IAttachmentProcessor } from '@domains/integration/service/attachment-processor.interface'
import type { IConversationDetector } from '@domains/integration/service/conversation-detector.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('discord')

export class DiscordService implements IDiscordService {
  private conversationDetector: IConversationDetector
  private attachmentProcessor: IAttachmentProcessor
  private agentExecutor: WorkspaceAgentExecutor
  private processedMessages = new Map<string, number>()
  private readonly MESSAGE_DEDUP_TTL_MS = 60_000

  /** Maps executionId -> platform context for stop button handling */
  public executionContexts = new Map<string, DiscordExecutionContext>()

  constructor() {
    this.conversationDetector = conversationDetector
    this.attachmentProcessor = attachmentProcessor
    this.agentExecutor = new WorkspaceAgentExecutor()
  }

  private isDuplicate(messageId: string): boolean {
    this.cleanupOldMessages()
    if (this.processedMessages.has(messageId)) {
      log.info(`Duplicate message ${messageId}, skipping`)
      return true
    }
    this.processedMessages.set(messageId, Date.now())
    return false
  }

  private cleanupOldMessages(): void {
    const now = Date.now()
    this.processedMessages.forEach((ts, id) => {
      if (now - ts > this.MESSAGE_DEDUP_TTL_MS) {
        this.processedMessages.delete(id)
      }
    })
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Create a new Discord connection for a workspace
   */
  async createConnection(
    workspaceId: string,
    guildId: string,
    createdBy: string,
    options: CreateConnectionOptions = {},
  ): Promise<DiscordConnection> {
    const now = new Date().toISOString()

    const data = await discordRepository.insertConnection({
      workspace_id: workspaceId,
      guild_id: guildId,
      guild_name: options.guildName || null,
      channel_id: options.channelId || null,
      agent_id: options.agentId || 'lazarus',
      bot_user_id: options.botUserId || null,
      webhook_url: options.webhookUrl || null,
      created_by: createdBy,
      settings: (options.settings ?? {}) as Json,
      enabled: true,
      created_at: now,
      updated_at: now,
    })

    return this.mapConnectionFromDb(data)
  }

  /**
   * Get a connection by its ID
   */
  async getConnection(connectionId: string): Promise<DiscordConnection | null> {
    const data = await discordRepository.findConnectionById(connectionId)
    if (!data) return null
    return this.mapConnectionFromDb(data)
  }

  /**
   * Get a connection by guild ID
   */
  async getConnectionByGuild(guildId: string): Promise<DiscordConnection | null> {
    const data = await discordRepository.findConnectionByGuild(guildId)
    if (!data) return null
    return this.mapConnectionFromDb(data)
  }

  /**
   * Get all connections for a workspace
   */
  async getConnectionsByWorkspace(workspaceId: string): Promise<DiscordConnection[]> {
    const rows = await discordRepository.findConnectionsByWorkspace(workspaceId)
    return rows.map((d) => this.mapConnectionFromDb(d))
  }

  /**
   * Update a connection
   */
  async updateConnection(
    connectionId: string,
    updates: Partial<{
      guildName: string
      channelId: string
      agentId: string
      botUserId: string
      webhookUrl: string
      settings: DiscordConnectionSettings
      enabled: boolean
    }>,
  ): Promise<void> {
    const updateRecord: Record<string, any> = {
      updated_at: new Date().toISOString(),
      ...(updates.guildName !== undefined && { guild_name: updates.guildName }),
      ...(updates.channelId !== undefined && { channel_id: updates.channelId }),
      ...(updates.agentId !== undefined && { agent_id: updates.agentId }),
      ...(updates.botUserId !== undefined && { bot_user_id: updates.botUserId }),
      ...(updates.webhookUrl !== undefined && { webhook_url: updates.webhookUrl }),
      ...(updates.settings !== undefined && { settings: updates.settings }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    }

    await discordRepository.updateConnection(connectionId, updateRecord)
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    await discordRepository.deleteConnection(connectionId)
  }

  // ============================================================================
  // Message Processing
  // ============================================================================

  /**
   * Process an incoming Discord message
   */
  async processMessage(
    message: DiscordMessage,
    sendResponse: (content: string, replyTo?: string) => Promise<void>,
    callbacks?: {
      sendStatusMessageWithButton?: (
        content: string,
        executionId: string,
        replyTo?: string,
      ) => Promise<string>
      editStatusMessage?: (channelId: string, messageId: string, content: string) => Promise<void>
    },
  ): Promise<void> {
    log.info(`Processing message from ${message.authorName} in channel ${message.channelId}`)

    // Dedup: skip if we've already processed this message (e.g. after bot reconnect)
    if (this.isDuplicate(message.messageId)) return

    // 1. Find the connection for this guild
    const connection = message.guildId ? await this.getConnectionByGuild(message.guildId) : null

    // For DMs, we need to find connection differently (by bot user ID or other means)
    if (!connection) {
      log.warn(`No connection found for guild ${message.guildId}`)
      await sendResponse(
        "I'm not configured for this server. Please ask an admin to set up the Lazarus integration.",
      )
      return
    }

    // 2. Check if we should respond (channel whitelist/blacklist)
    if (!this.shouldRespond(connection, message)) {
      log.debug(`Skipping message - not configured to respond`)
      return
    }

    // 3. Check interaction access (which Discord roles can interact with the agent)
    if (!this.checkInteractionAccess(connection, message)) {
      log.debug(`Skipping message - user ${message.authorName} lacks required role for interaction`)
      return
    }

    // 3b. Check credits — if insufficient, reply in Discord and stop
    const creditsCheck = await creditsGuard(
      connection.workspaceId,
      () => sendResponse(INSUFFICIENT_CREDITS_MESSAGE, message.messageId),
      'discord',
    )
    if (!creditsCheck.allowed) return

    // 3. Get or create conversation thread
    const conversationContext = await this.conversationDetector.getOrCreateConversation(
      'discord',
      connection.id,
      message.channelId,
      message.threadId,
    )

    // 4. Process attachments
    let processedAttachments: ProcessedAttachment[] = []
    if (message.attachments.length > 0) {
      processedAttachments = await this.attachmentProcessor.processDiscordAttachments(
        message.attachments,
        connection.workspaceId,
        connection.agentId,
      )
    }

    // 5. Store the incoming message
    await this.conversationDetector.storeMessage('discord', conversationContext.id, {
      platformMessageId: message.messageId,
      authorId: message.authorId,
      authorName: message.authorName,
      content: message.content,
      isFromBot: false,
      attachments: this.attachmentProcessor.toStorageFormat(processedAttachments),
    })

    // 6. Build task context for the agent
    const taskContext = await this.buildTaskContext(
      message,
      processedAttachments,
      conversationContext,
    )

    // 7. Execute the agent
    try {
      const executionId = uuidv4()
      const agentId = connection.agentId || 'lazarus'

      // Pressure-aware queueing: under memory pressure, route through executionQueue
      // so we cap concurrency and tell the user their task is briefly delayed.
      const underPressure = memoryPressureMonitor.isUnderPressure()

      if (underPressure && !executionQueue.canAccept(agentId)) {
        log.warn(
          { agentId, executionId, workspaceId: connection.workspaceId },
          'Discord: rejecting message — memory pressure and execution queue full',
        )
        await sendResponse(
          "I'm overloaded right now — please try again in a few minutes.",
          message.messageId,
        )
        return
      }

      const initialStatus = underPressure
        ? 'Got your request. The system is busy — your task is queued and will run in a moment.'
        : 'Thinking...'

      // Send status message with Stop button (or fallback to plain text)
      let statusMessageId: string | undefined
      if (callbacks?.sendStatusMessageWithButton) {
        try {
          statusMessageId = await callbacks.sendStatusMessageWithButton(
            initialStatus,
            executionId,
            message.messageId,
          )
        } catch {
          await sendResponse(initialStatus, message.messageId)
        }
      } else {
        await sendResponse(initialStatus, message.messageId)
      }

      // Track execution context for stop button handling
      this.executionContexts.set(executionId, {
        executionId,
        channelId: message.channelId,
        statusMessageId,
        userId: message.authorId,
      })

      let fullResponse = ''

      // Generate a title for the activity log using AI
      // Falls back to quick title if AI fails
      const conversationTitle = await generateConversationTitle(message.content, 'discord', {
        channelName: connection.guildName,
        userName: message.authorName,
      })

      const runAgentExecution = async (): Promise<void> => {
        // Once a slot is acquired (or immediately when not pressured), edit the
        // status message so the user sees the transition from "queued" to "starting".
        if (underPressure && statusMessageId && callbacks?.editStatusMessage) {
          try {
            await callbacks.editStatusMessage(
              message.channelId,
              statusMessageId,
              'Starting now — working on your request...',
            )
          } catch {
            /* best-effort */
          }
        }

        await this.agentExecutor.executeAgent({
          executionId,
          agentId,
          workspaceId: connection.workspaceId,
          userId: connection.createdBy,
          task: taskContext,
          userMessage: message.content,
          maxTurns: MAX_TURNS.discord,
          // Platform integration for activity logging
          platformSource: 'discord',
          conversationTitle,
          platformMetadata: {
            channelId: message.channelId,
            threadId: message.threadId,
            guildId: message.guildId || undefined,
            guildName: connection.guildName,
            userName: message.authorName,
            userId: message.authorId,
          },
          onMessage: async (agentMessage) => {
            // Handle assistant messages
            if (agentMessage.type === 'assistant' && agentMessage.message?.content) {
              for (const block of agentMessage.message.content) {
                if (block.type === 'text' && block.text) {
                  fullResponse += block.text
                }
              }
            }

            // Handle final result
            if (agentMessage.type === 'result') {
              log.info(
                `Result message received - subtype: ${agentMessage.subtype}, hasResult: ${!!agentMessage.result}, fullResponseLength: ${fullResponse.length}`,
              )
              const finalContent = agentMessage.result || fullResponse
              if (finalContent) {
                log.info(`Sending response to Discord, length: ${finalContent.length}`)
                // Send chunked response (Discord has 2000 char limit)
                await this.sendChunkedResponse(finalContent, sendResponse, message.messageId)

                // Store bot response for conversation history
                await this.storeBotResponse(
                  conversationContext.id,
                  `bot-${Date.now()}`,
                  finalContent,
                )
              } else {
                log.warn(
                  `No content to send - result: ${agentMessage.result}, fullResponse: ${fullResponse}`,
                )
              }
            }
          },
        })
      }

      if (underPressure) {
        const queueResult = await executionQueue.withSlot(
          { executionId, agentId, workspaceId: connection.workspaceId },
          runAgentExecution,
        )
        if (queueResult.status === 'skipped') {
          log.info(
            { agentId, executionId, reason: queueResult.reason },
            'Discord: deduped — agent already active',
          )
          await sendResponse(
            "I'm already working on a request for this agent — please wait for it to finish before sending another.",
            message.messageId,
          )
          this.executionContexts.delete(executionId)
          return
        }
        if (queueResult.status === 'queue_full') {
          log.warn({ agentId, executionId }, 'Discord: queue saturated after slot acquire attempt')
          await sendResponse(
            'Sorry, the queue is full right now. Please try again in a few minutes.',
            message.messageId,
          )
          this.executionContexts.delete(executionId)
          return
        }
      } else {
        await runAgentExecution()
      }

      // Remove Stop button from status message (keep "Thinking..." text)
      if (statusMessageId && callbacks?.editStatusMessage) {
        try {
          await callbacks.editStatusMessage(message.channelId, statusMessageId, 'Thinking...')
        } catch {
          /* best-effort */
        }
      }
      this.executionContexts.delete(executionId)

      // Update conversation with session info
      await this.conversationDetector.updateConversation('discord', conversationContext.id, {
        incrementMessageCount: true,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const isCancelled = errorMsg.includes('Cancelled via')

      // Clean up execution context and update status message for non-cancel errors
      for (const [execId, ctx] of this.executionContexts) {
        if (ctx.channelId === message.channelId && ctx.userId === message.authorId) {
          if (!isCancelled && ctx.statusMessageId && callbacks?.editStatusMessage) {
            try {
              await callbacks.editStatusMessage(
                message.channelId,
                ctx.statusMessageId,
                `Task failed: ${errorMsg}`,
              )
            } catch {
              /* best-effort */
            }
          }
          this.executionContexts.delete(execId)
          break
        }
      }

      if (isCancelled) {
        log.info('Execution was cancelled by user')
        await sendResponse('Task was cancelled.', message.messageId)
      } else {
        log.error({ err: error }, 'Error executing agent')
        await sendResponse(
          `Sorry, I encountered an error while processing your message: ${errorMsg}`,
          message.messageId,
        )
      }
    }
  }

  /**
   * Send a response, chunking if necessary (Discord 2000 char limit)
   */
  private async sendChunkedResponse(
    content: string,
    sendResponse: (content: string, replyTo?: string) => Promise<void>,
    replyTo?: string,
  ): Promise<void> {
    const MAX_LENGTH = 2000
    const chunks = this.splitMessage(content, MAX_LENGTH)

    for (let i = 0; i < chunks.length; i++) {
      // Only reply to the original message for the first chunk
      await sendResponse(chunks[i]!, i === 0 ? replyTo : undefined)

      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await this.delay(500)
      }
    }

    // Store the bot's response in message history
    // Note: We'd need the actual message ID from Discord to store properly
    // This is handled by the bot when it sends the message
  }

  /**
   * Split a message into chunks respecting word boundaries
   */
  private splitMessage(content: string, maxLength: number): string[] {
    if (content.length <= maxLength) {
      return [content]
    }

    const chunks: string[] = []
    let remaining = content

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining)
        break
      }

      // Find a good break point (newline, space, or punctuation)
      let breakPoint = maxLength

      // Try to break at newline first
      const lastNewline = remaining.lastIndexOf('\n', maxLength)
      if (lastNewline > maxLength * 0.5) {
        breakPoint = lastNewline + 1
      } else {
        // Try to break at space
        const lastSpace = remaining.lastIndexOf(' ', maxLength)
        if (lastSpace > maxLength * 0.5) {
          breakPoint = lastSpace + 1
        }
      }

      chunks.push(remaining.substring(0, breakPoint).trim())
      remaining = remaining.substring(breakPoint).trim()
    }

    return chunks
  }

  /**
   * Build the task context string for the agent, including conversation history
   */
  private async buildTaskContext(
    message: DiscordMessage,
    attachments: ProcessedAttachment[],
    conversation: ConversationContext,
  ): Promise<string> {
    let context = ''

    if (message.referencedContent) {
      context += `${message.authorName} is replying to a message from ${message.referencedAuthorName || 'unknown'}:\n\n${message.referencedContent}\n\n---\n`
    }

    context += `Discord message from ${message.authorName}:\n\n${message.content}`

    // Add attachment context
    if (attachments.length > 0) {
      context += this.attachmentProcessor.buildAttachmentContext(attachments)
    }

    if (!conversation.isNewConversation && conversation.messageCount > 0) {
      context += `\n\n---\nThis is part of an ongoing conversation in channel ${message.channelId}. If you need prior messages to respond well, fetch them with the \`fetch_discord_channel_history\` tool. Otherwise reply to the latest message above.`
    }

    context += `\n\n---\nReply via \`send_discord_message\` (channel_id="${message.channelId}"). On error, post the error there too — the user expects a Discord response either way.`

    return context
  }

  /**
   * Check if the bot should respond to this message
   */
  /**
   * Check if the message author has the required Discord role to interact with the agent.
   * Defaults to allowing everyone if interactionAccess is not configured.
   */
  private checkInteractionAccess(connection: DiscordConnection, message: DiscordMessage): boolean {
    const access = connection.settings.interactionAccess

    // Default: everyone can interact (backward compatible)
    if (!access || access.allowedBy === 'everyone') return true

    // Role-restricted: check if user has any of the allowed roles
    if (!access.roleIds?.length) return true // No roles configured = everyone

    // memberRoleIds is populated by discord-bot.ts from the guild member
    if (!message.memberRoleIds?.length) return false

    return message.memberRoleIds.some((roleId) => access.roleIds!.includes(roleId))
  }

  private shouldRespond(connection: DiscordConnection, message: DiscordMessage): boolean {
    const settings = connection.settings

    // Check if mentions are required
    if (settings.respondToMentions === false && message.mentionedBot) {
      return false
    }

    // Check DM settings
    if (message.isDM && settings.respondToDMs === false) {
      return false
    }

    // Check channel whitelist
    if (settings.channelWhitelist?.length) {
      if (!settings.channelWhitelist.includes(message.channelId)) {
        return false
      }
    }

    // Check channel blacklist
    if (settings.channelBlacklist?.length) {
      if (settings.channelBlacklist.includes(message.channelId)) {
        return false
      }
    }

    return true
  }

  /**
   * Store a bot response message
   */
  async storeBotResponse(
    conversationId: string,
    messageId: string,
    content: string,
  ): Promise<void> {
    await this.conversationDetector.storeMessage('discord', conversationId, {
      platformMessageId: messageId,
      authorId: 'bot',
      authorName: 'Lazarus',
      content,
      isFromBot: true,
    })
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapConnectionFromDb(data: any): DiscordConnection {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      guildId: data.guild_id,
      guildName: data.guild_name,
      channelId: data.channel_id,
      agentId: data.agent_id,
      botUserId: data.bot_user_id,
      webhookUrl: data.webhook_url,
      createdBy: data.created_by,
      settings: data.settings || {},
      enabled: data.enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const discordService: IDiscordService = new DiscordService()
