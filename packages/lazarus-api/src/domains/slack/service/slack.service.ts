/**
 * Slack Integration Service
 *
 * Manages Slack connections and message handling for Lazarus workspaces.
 * Uses @slack/web-api for sending messages and Supabase for persistence.
 */

import { WebClient } from '@slack/web-api'
import type { Json } from '@infrastructure/database/database.types'
import { slackRepository } from '@domains/slack/repository/slack.repository'
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
import { generateQuickTitle } from '@domains/conversation/service/conversation-title.service'
import { MAX_TURNS } from '@infrastructure/config/max-turns'
import { v4 as uuidv4 } from 'uuid'
import type {
  CreateSlackConnectionOptions,
  SlackConnection,
  SlackConnectionSettings,
  SlackExecutionContext,
  SlackMessage,
} from '@domains/slack/types/slack.types'
import type { ISlackService } from './slack.service.interface'
import type { IAttachmentProcessor } from '@domains/integration/service/attachment-processor.interface'
import type { IConversationDetector } from '@domains/integration/service/conversation-detector.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('slack')

export class SlackService implements ISlackService {
  private clients: Map<string, WebClient> = new Map()
  private conversationDetector: IConversationDetector
  private attachmentProcessor: IAttachmentProcessor
  private agentExecutor: WorkspaceAgentExecutor

  /** Maps executionId -> platform context for stop button handling */
  public executionContexts = new Map<string, SlackExecutionContext>()

  constructor() {
    this.conversationDetector = conversationDetector
    this.attachmentProcessor = attachmentProcessor
    this.agentExecutor = new WorkspaceAgentExecutor()
  }

  // ============================================================================
  // Client Management
  // ============================================================================

  /**
   * Get or create a Slack WebClient for a connection
   */
  getClient(connectionId: string, botToken?: string): WebClient {
    if (this.clients.has(connectionId)) {
      return this.clients.get(connectionId)!
    }

    if (!botToken) {
      throw new Error(`No bot token available for connection ${connectionId}`)
    }

    const client = new WebClient(botToken)
    this.clients.set(connectionId, client)
    return client
  }

  /**
   * Remove a cached client
   */
  removeClient(connectionId: string): void {
    this.clients.delete(connectionId)
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Create a new Slack connection for a workspace
   */
  async createConnection(
    workspaceId: string,
    slackTeamId: string,
    botToken: string,
    createdBy: string,
    options: CreateSlackConnectionOptions = {},
  ): Promise<SlackConnection> {
    const now = new Date().toISOString()

    const data = await slackRepository.insertConnection({
      workspace_id: workspaceId,
      slack_team_id: slackTeamId,
      slack_team_name: options.slackTeamName || null,
      channel_id: options.channelId || null,
      agent_id: options.agentId || null,
      bot_token: botToken,
      bot_user_id: options.botUserId || null,
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
  async getConnection(connectionId: string): Promise<SlackConnection | null> {
    const data = await slackRepository.findConnectionById(connectionId)
    if (!data) return null
    return this.mapConnectionFromDb(data)
  }

  /**
   * Get a connection by Slack team ID
   */
  async getConnectionByTeam(teamId: string): Promise<SlackConnection | null> {
    const data = await slackRepository.findConnectionByTeam(teamId)
    if (!data) return null
    return this.mapConnectionFromDb(data)
  }

  /**
   * Get all connections for a workspace
   */
  async getConnectionsByWorkspace(workspaceId: string): Promise<SlackConnection[]> {
    const rows = await slackRepository.findConnectionsByWorkspace(workspaceId)
    return rows.map((d) => this.mapConnectionFromDb(d))
  }

  /**
   * Update a connection
   */
  async updateConnection(
    connectionId: string,
    updates: Partial<{
      slackTeamName: string
      channelId: string
      agentId: string
      botUserId: string
      settings: SlackConnectionSettings
      enabled: boolean
    }>,
  ): Promise<void> {
    const updateRecord: Record<string, any> = {
      updated_at: new Date().toISOString(),
      ...(updates.slackTeamName !== undefined && { slack_team_name: updates.slackTeamName }),
      ...(updates.channelId !== undefined && { channel_id: updates.channelId }),
      ...(updates.agentId !== undefined && { agent_id: updates.agentId }),
      ...(updates.botUserId !== undefined && { bot_user_id: updates.botUserId }),
      ...(updates.settings !== undefined && { settings: updates.settings }),
      ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    }

    await slackRepository.updateConnection(connectionId, updateRecord)

    // Remove cached client to force re-creation with new settings
    this.removeClient(connectionId)
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    await slackRepository.deleteConnection(connectionId)

    // Remove cached client
    this.removeClient(connectionId)
  }

  // ============================================================================
  // Message Processing
  // ============================================================================

  /**
   * Process an incoming Slack message (from Events API)
   */
  async processMessage(message: SlackMessage): Promise<void> {
    // Ignore bot messages
    if (message.botId) return

    log.info(
      `Processing message from ${message.userName || message.userId} in team ${message.teamId}`,
    )

    // 1. Find the connection for this Slack team
    const connection = await this.getConnectionByTeam(message.teamId)

    if (!connection) {
      log.warn(`No connection found for team ${message.teamId}`)
      return
    }

    // 2. Check if we should respond
    if (!this.shouldRespond(connection, message)) {
      log.debug(`Skipping message - not configured to respond`)
      return
    }

    // 3. Check credits — if insufficient, reply in Slack thread and stop
    const creditsCheck = await creditsGuard(
      connection.workspaceId,
      async () => {
        await this.sendMessage(
          connection.id,
          connection.botToken,
          message.channelId,
          INSUFFICIENT_CREDITS_MESSAGE,
          message.threadTs || message.ts,
        )
      },
      'slack',
    )
    if (!creditsCheck.allowed) return

    // 4. Get or create conversation thread
    const conversationContext = await this.conversationDetector.getOrCreateConversation(
      'slack',
      connection.id,
      message.channelId,
      message.threadTs,
    )

    // 5. Process attachments
    let processedAttachments: ProcessedAttachment[] = []
    if (message.files && message.files.length > 0) {
      processedAttachments = await this.attachmentProcessor.processSlackFiles(
        message.files,
        connection.botToken,
        connection.workspaceId,
        connection.agentId,
      )
    }

    // 6. Store the incoming message
    await this.conversationDetector.storeMessage('slack', conversationContext.id, {
      platformMessageId: message.ts,
      authorId: message.userId,
      authorName: message.userName,
      content: message.text,
      isFromBot: false,
      attachments: this.attachmentProcessor.toStorageFormat(processedAttachments),
    })

    // 7. Build task context for the agent
    const threadTs = message.threadTs || message.ts
    const taskContext = await this.buildTaskContext(
      message,
      processedAttachments,
      conversationContext,
      threadTs,
    )

    // 8. Execute the agent
    try {
      const executionId = uuidv4()
      const agentId = connection.agentId || 'lazarus'

      // Pressure-aware queueing: under memory pressure, route through executionQueue
      // so we cap concurrency and tell the user their task is briefly delayed.
      const underPressure = memoryPressureMonitor.isUnderPressure()

      if (underPressure && !executionQueue.canAccept(agentId)) {
        log.warn(
          { agentId, executionId, workspaceId: connection.workspaceId },
          'Slack: rejecting message — memory pressure and execution queue full',
        )
        await this.sendMessage(
          connection.id,
          connection.botToken,
          message.channelId,
          "I'm overloaded right now — please try again in a few minutes.",
          threadTs,
        )
        return
      }

      const initialStatus = underPressure
        ? 'Got your request. The system is busy — your task is queued and will run in a moment.'
        : 'Thinking...'

      // Send status message with Stop button in thread
      let statusMessageTs: string | undefined
      try {
        statusMessageTs = await this.sendBlocks(
          connection.id,
          connection.botToken,
          message.channelId,
          [
            { type: 'section', text: { type: 'mrkdwn', text: initialStatus } },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Stop' },
                  style: 'danger',
                  action_id: `stop_execution:${executionId}`,
                },
              ],
            },
          ],
          initialStatus,
          threadTs,
        )
      } catch {
        // Fallback to plain text
        statusMessageTs = undefined
      }

      // Track execution context for stop button handling
      this.executionContexts.set(executionId, {
        executionId,
        connectionId: connection.id,
        botToken: connection.botToken,
        channelId: message.channelId,
        statusMessageTs,
        userId: message.userId,
      })

      let fullResponse = ''

      // Generate a quick title for the activity log
      const conversationTitle = generateQuickTitle(message.text, message.userName)

      const runAgentExecution = async (): Promise<void> => {
        // Once a slot is acquired (or immediately when not pressured), edit the
        // status message so the user sees the transition from "queued" to "starting".
        if (underPressure && statusMessageTs) {
          try {
            await this.updateMessageBlocks(
              connection.id,
              connection.botToken,
              message.channelId,
              statusMessageTs,
              'Starting now — working on your request...',
              [
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: 'Stop' },
                      style: 'danger',
                      action_id: `stop_execution:${executionId}`,
                    },
                  ],
                },
              ],
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
          userMessage: message.text,
          maxTurns: MAX_TURNS.slack,
          // Platform integration for activity logging
          platformSource: 'slack',
          conversationTitle,
          platformMetadata: {
            channelId: message.channelId,
            threadId: message.threadTs,
            guildId: message.teamId,
            guildName: connection.slackTeamName,
            userName: message.userName,
            userId: message.userId,
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
                log.info(`Sending response to Slack, length: ${finalContent.length}`)
                // Send response in thread
                await this.sendMessage(
                  connection.id,
                  connection.botToken,
                  message.channelId,
                  this.formatForSlack(finalContent),
                  threadTs,
                )

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
            'Slack: deduped — agent already active',
          )
          await this.sendMessage(
            connection.id,
            connection.botToken,
            message.channelId,
            "I'm already working on a request for this agent — please wait for it to finish before sending another.",
            threadTs,
          )
          this.executionContexts.delete(executionId)
          return
        }
        if (queueResult.status === 'queue_full') {
          log.warn({ agentId, executionId }, 'Slack: queue saturated after slot acquire attempt')
          await this.sendMessage(
            connection.id,
            connection.botToken,
            message.channelId,
            'Sorry, the queue is full right now. Please try again in a few minutes.',
            threadTs,
          )
          this.executionContexts.delete(executionId)
          return
        }
      } else {
        await runAgentExecution()
      }

      // Remove Stop button from status message (keep "Thinking..." text)
      if (statusMessageTs) {
        try {
          await this.updateMessageBlocks(
            connection.id,
            connection.botToken,
            message.channelId,
            statusMessageTs,
            'Thinking...',
            [],
          )
        } catch {
          /* best-effort */
        }
      }
      this.executionContexts.delete(executionId)

      // Update conversation with session info
      await this.conversationDetector.updateConversation('slack', conversationContext.id, {
        incrementMessageCount: true,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      const isCancelled = errorMsg.includes('Cancelled via')

      // Clean up execution context and update status message for non-cancel errors
      for (const [execId, ctx] of this.executionContexts) {
        if (ctx.channelId === message.channelId && ctx.userId === message.userId) {
          if (!isCancelled && ctx.statusMessageTs) {
            try {
              await this.updateMessageBlocks(
                connection.id,
                connection.botToken,
                message.channelId,
                ctx.statusMessageTs,
                `Task failed: ${errorMsg}`,
                [],
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
        await this.sendMessage(
          connection.id,
          connection.botToken,
          message.channelId,
          'Task was cancelled.',
          message.threadTs || message.ts,
        )
      } else {
        log.error({ err: error }, 'Error executing agent')
        await this.sendMessage(
          connection.id,
          connection.botToken,
          message.channelId,
          `Sorry, I encountered an error while processing your message: ${errorMsg}`,
          message.threadTs || message.ts,
        )
      }
    }
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  /**
   * Send a message to a Slack channel
   */
  async sendMessage(
    connectionId: string,
    botToken: string,
    channelId: string,
    text: string,
    threadTs?: string,
  ): Promise<string | undefined> {
    try {
      const client = this.getClient(connectionId, botToken)

      const result = await client.chat.postMessage({
        channel: channelId,
        text,
        thread_ts: threadTs,
        unfurl_links: false,
        unfurl_media: false,
      })

      return result.ts
    } catch (error) {
      log.error({ err: error }, 'Error sending message')
      throw error
    }
  }

  /**
   * Send a message with blocks (rich formatting)
   */
  async sendBlocks(
    connectionId: string,
    botToken: string,
    channelId: string,
    blocks: any[],
    text: string,
    threadTs?: string,
  ): Promise<string | undefined> {
    try {
      const client = this.getClient(connectionId, botToken)

      const result = await client.chat.postMessage({
        channel: channelId,
        blocks,
        text, // Fallback text for notifications
        thread_ts: threadTs,
      })

      return result.ts
    } catch (error) {
      log.error({ err: error }, 'Error sending blocks')
      throw error
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(
    connectionId: string,
    botToken: string,
    channelId: string,
    ts: string,
    text: string,
  ): Promise<void> {
    try {
      const client = this.getClient(connectionId, botToken)

      await client.chat.update({
        channel: channelId,
        ts,
        text,
      })
    } catch (error) {
      log.error({ err: error }, 'Error updating message')
      throw error
    }
  }

  /**
   * Update an existing message with blocks (or remove blocks)
   */
  async updateMessageBlocks(
    connectionId: string,
    botToken: string,
    channelId: string,
    ts: string,
    text: string,
    blocks: any[],
  ): Promise<void> {
    try {
      const client = this.getClient(connectionId, botToken)

      await client.chat.update({
        channel: channelId,
        ts,
        text,
        blocks,
      })
    } catch (error) {
      log.error({ err: error }, 'Error updating message blocks')
      throw error
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    connectionId: string,
    botToken: string,
    channelId: string,
    ts: string,
    emoji: string,
  ): Promise<void> {
    try {
      const client = this.getClient(connectionId, botToken)

      await client.reactions.add({
        channel: channelId,
        timestamp: ts,
        name: emoji,
      })
    } catch (error) {
      log.error({ err: error }, 'Error adding reaction')
      // Don't throw - reactions are not critical
    }
  }

  // ============================================================================
  // Formatting
  // ============================================================================

  /**
   * Convert markdown to Slack mrkdwn format
   */
  formatForSlack(markdown: string): string {
    return (
      markdown
        // Bold: **text** -> *text*
        .replace(/\*\*(.+?)\*\*/g, '*$1*')
        // Italic: *text* or _text_ -> _text_
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_')
        // Code blocks: ```lang\ncode\n``` -> ```code```
        .replace(/```(\w+)?\n([\s\S]+?)\n```/g, '```$2```')
        // Links: [text](url) -> <url|text>
        .replace(/\[(.+?)\]\((.+?)\)/g, '<$2|$1>')
        // Headers: # text -> *text*
        .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
        // Lists: - item -> • item
        .replace(/^-\s+(.+)$/gm, '• $1')
      // Numbered lists: 1. item -> 1. item (keep as-is)
    )
  }

  /**
   * Build rich Slack blocks for a response
   */
  buildResponseBlocks(content: string, metadata?: { title?: string; agentName?: string }): any[] {
    const blocks: any[] = []

    // Header if title provided
    if (metadata?.title) {
      blocks.push({
        type: 'header',
        text: { type: 'plain_text', text: metadata.title },
      })
    }

    // Main content
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: this.formatForSlack(content) },
    })

    // Footer with agent info
    if (metadata?.agentName) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Powered by ${metadata.agentName} • Lazarus AI_`,
          },
        ],
      })
    }

    return blocks
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Build the task context string for the agent, including conversation history
   */
  private async buildTaskContext(
    message: SlackMessage,
    attachments: ProcessedAttachment[],
    conversation: ConversationContext,
    threadTs?: string,
  ): Promise<string> {
    const isContinuing = !conversation.isNewConversation && conversation.messageCount > 0
    const threadInstruction = threadTs ? ` and thread_ts="${threadTs}"` : ''
    const historyHint = isContinuing
      ? `\n\n---\nThis is part of an ongoing conversation in channel ${message.channelId}${threadTs ? ` (thread ${threadTs})` : ''}. If you need prior messages to respond well, fetch them with the \`fetch_slack_channel_history\` tool${threadTs ? ` or \`get_slack_thread_replies\`` : ''}. Otherwise reply to the latest message above.`
      : null

    const context = [
      `Slack message from ${message.userName || message.userId}:\n\n${message.text}`,
      attachments.length > 0 ? this.attachmentProcessor.buildAttachmentContext(attachments) : null,
      historyHint,
      `\n\n---\nReply via \`send_slack_message\` (channel_id="${message.channelId}"${threadInstruction}). On error, post the error there too — the user expects a Slack response either way.`,
    ]
      .filter(Boolean)
      .join('')

    return context
  }

  /**
   * Check if the bot should respond to this message
   */
  private shouldRespond(connection: SlackConnection, message: SlackMessage): boolean {
    const settings = connection.settings

    // Check if mentions are required but this isn't a mention
    if (settings.respondToMentions === false && !message.isMention) {
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
  async storeBotResponse(conversationId: string, ts: string, content: string): Promise<void> {
    await this.conversationDetector.storeMessage('slack', conversationId, {
      platformMessageId: ts,
      authorId: 'bot',
      authorName: 'Lazarus',
      content,
      isFromBot: true,
    })
  }

  /**
   * Get user info from Slack
   */
  async getUserInfo(
    connectionId: string,
    botToken: string,
    userId: string,
  ): Promise<{ name: string; realName?: string; email?: string } | null> {
    try {
      const client = this.getClient(connectionId, botToken)
      const result = await client.users.info({ user: userId })

      if (result.user) {
        return {
          name: result.user.name || userId,
          realName: result.user.real_name,
          email: result.user.profile?.email,
        }
      }

      return null
    } catch (error) {
      log.error({ err: error }, 'Error getting user info')
      return null
    }
  }

  private mapConnectionFromDb(data: any): SlackConnection {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      slackTeamId: data.slack_team_id,
      slackTeamName: data.slack_team_name,
      channelId: data.channel_id,
      agentId: data.agent_id,
      botToken: data.bot_token,
      botUserId: data.bot_user_id,
      createdBy: data.created_by,
      settings: data.settings || {},
      enabled: data.enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}

// Export singleton instance
export const slackService: ISlackService = new SlackService()
