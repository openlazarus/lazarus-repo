/**
 * Discord Bot Gateway Service
 *
 * Handles the Discord Gateway connection using discord.js.
 * Listens for messages and routes them to the DiscordService for processing.
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  TextChannel,
  DMChannel,
  ThreadChannel,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageEditOptions,
  Interaction,
} from 'discord.js'
import type { DiscordBotConfig, DiscordMessage } from '@domains/discord/types/discord.types'
import { discordService } from './discord.service'
import type { IDiscordService } from './discord.service.interface'
import { setDiscordClient } from '@tools/integration-channel-tools'
import { executionAbortRegistry } from '@domains/agent/service/execution-abort-registry'
import { executionCache } from '@realtime'
import type { IDiscordBot } from './discord-bot.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('discord-bot')

export class DiscordBot implements IDiscordBot {
  private client: Client | null = null
  private discordService: IDiscordService
  private isConnected: boolean = false
  private token: string | null = null

  constructor(config: DiscordBotConfig = {}) {
    this.discordService = discordService
    this.token = config.token || process.env.DISCORD_BOT_TOKEN || null
  }

  /**
   * Check if the bot is configured and can be started
   */
  isConfigured(): boolean {
    return !!this.token
  }

  /**
   * Initialize and connect the Discord bot
   */
  async start(): Promise<void> {
    if (!this.token) {
      log.warn('No DISCORD_BOT_TOKEN configured, Discord integration disabled')
      return
    }

    if (this.isConnected) {
      log.warn('Already connected')
      return
    }

    try {
      // Create client with required intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildMembers, // Privileged intent - required for member/role management
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent, // Privileged intent - requires Discord Developer Portal enable
        ],
      })

      this.setupEventHandlers()

      // Login to Discord
      await this.client.login(this.token)

      // Share client with channel tools for API access
      setDiscordClient(this.client)

      log.info('Successfully connected to Discord')
      this.isConnected = true
    } catch (error) {
      log.error({ err: error }, 'Failed to connect')
      throw error
    }
  }

  /**
   * Initialize a REST-only Discord client (no gateway WS) so workspace VM tools
   * can call Discord APIs while the orchestrator owns the gateway connection.
   */
  async startRestOnly(): Promise<void> {
    if (!this.token) {
      log.warn('No DISCORD_BOT_TOKEN configured, REST-only init skipped')
      return
    }
    if (this.isConnected) return

    this.client = new Client({ intents: [GatewayIntentBits.Guilds] })
    this.client.token = this.token
    this.client.rest.setToken(this.token)
    setDiscordClient(this.client)
    this.isConnected = true
    log.info('Discord client initialized in REST-only mode')
  }

  /**
   * Disconnect the Discord bot
   */
  async stop(): Promise<void> {
    if (this.client) {
      setDiscordClient(null) // Clear client from tools
      this.client.destroy()
      this.client = null
      this.isConnected = false
      log.info('Disconnected from Discord')
    }
  }

  /**
   * Get bot status
   */
  getStatus(): { connected: boolean; guilds: number; username?: string } {
    if (!this.client || !this.isConnected) {
      return { connected: false, guilds: 0 }
    }

    return {
      connected: true,
      guilds: this.client.guilds.cache.size,
      username: this.client.user?.username,
    }
  }

  /**
   * Set up Discord.js event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return

    // Ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      log.info(`Logged in as ${readyClient.user.tag}`)
      log.info(`Connected to ${readyClient.guilds.cache.size} guilds`)

      // Log connected guilds
      readyClient.guilds.cache.forEach((guild) => {
        log.info(`- ${guild.name} (${guild.id})`)
      })
    })

    // Message create event
    this.client.on(Events.MessageCreate, async (message) => {
      await this.handleMessage(message)
    })

    // Interaction create event (button clicks)
    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.handleInteraction(interaction)
    })

    // Guild join event - log when bot is added to a server
    this.client.on(Events.GuildCreate, (guild) => {
      log.info(`Joined guild: ${guild.name} (${guild.id})`)
    })

    // Guild remove event - log when bot is removed from a server
    this.client.on(Events.GuildDelete, (guild) => {
      log.info(`Removed from guild: ${guild.name} (${guild.id})`)
    })

    // Error handling
    this.client.on(Events.Error, (error) => {
      log.error({ err: error }, 'Client error')
    })

    this.client.on(Events.Warn, (warning) => {
      log.warn({ data: warning }, 'Client warning')
    })
  }

  /**
   * Handle incoming Discord messages
   */
  private async handleMessage(message: Message): Promise<void> {
    // Ignore messages from bots (including self)
    if (message.author.bot) return

    // Check if bot was mentioned or if it's a DM
    const isMentioned = message.mentions.has(this.client!.user!)
    const isDM = message.channel.type === ChannelType.DM

    // Only respond to @mentions or DMs
    if (!isMentioned && !isDM) return

    log.info(
      `Received message from ${message.author.username} in ${isDM ? 'DM' : message.guild?.name || 'unknown'}`,
    )

    // Build the Discord message object
    const discordMessage: DiscordMessage = {
      messageId: message.id,
      guildId: message.guildId,
      channelId: message.channelId,
      threadId: message.channel.isThread() ? message.channelId : undefined,
      authorId: message.author.id,
      authorName: message.author.username,
      content: this.cleanMessageContent(message),
      mentionedBot: isMentioned,
      isDM,
      referencedMessageId: message.reference?.messageId,
      attachments: message.attachments.map((att) => ({
        id: att.id,
        filename: att.name || 'unknown',
        url: att.url,
        proxy_url: att.proxyURL,
        content_type: att.contentType || undefined,
        size: att.size,
        width: att.width || undefined,
        height: att.height || undefined,
      })),
      memberRoleIds: message.member?.roles.cache.map((role) => role.id),
    }

    // Fetch referenced message content if this is a reply
    if (message.reference?.messageId) {
      try {
        const referenced = await message.channel.messages.fetch(message.reference.messageId)
        discordMessage.referencedContent = referenced.content
        discordMessage.referencedAuthorName = referenced.author.username
      } catch (err) {
        log.debug({ err }, 'Could not fetch referenced message')
      }
    }

    // Create response function that sends to the correct channel
    const channel = message.channel as TextChannel | DMChannel | ThreadChannel
    const sendResponse = async (content: string, replyTo?: string): Promise<void> => {
      await this.sendResponse(channel, content, replyTo)
    }

    // Process the message
    try {
      await this.discordService.processMessage(discordMessage, sendResponse, {
        sendStatusMessageWithButton: (content, executionId, replyTo) =>
          this.sendStatusMessageWithButton(channel, content, executionId, replyTo),
        editStatusMessage: (chId, msgId, content) => this.editStatusMessage(chId, msgId, content),
      })
    } catch (error) {
      log.error({ err: error }, 'Error processing message')
      try {
        await message.reply('Sorry, I encountered an error while processing your message.')
      } catch (err) {
        log.debug({ err }, 'Failed to send error message')
      }
    }
  }

  /**
   * Handle button interactions via the gateway
   */
  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return

    const [action, ...params] = interaction.customId.split(':')
    if (action !== 'stop_execution') return

    const executionId = params[0]
    if (!executionId) {
      await interaction.reply({ content: 'Invalid stop request.', ephemeral: true })
      return
    }

    log.info(`Stop button clicked for execution ${executionId} by ${interaction.user.username}`)

    // Authorization: check if the user who triggered the task is the one clicking
    const execCtx = this.discordService.executionContexts.get(executionId)
    if (execCtx && execCtx.userId !== interaction.user.id) {
      await interaction.reply({
        content: 'Only the user who triggered this task can stop it.',
        ephemeral: true,
      })
      return
    }

    // Check if execution is still running
    const execution = executionCache.get(executionId)
    if (!execution || execution.status !== 'running') {
      await interaction.update({ content: 'Task already finished.', components: [] })
      return
    }

    // Abort the execution
    executionAbortRegistry.abort(executionId, 'Cancelled via Discord')
    executionCache.cancel(executionId, 'Cancelled via Discord')
    this.discordService.executionContexts.delete(executionId)

    // Just remove the button, keep the original "Thinking..." text
    await interaction.update({ components: [] })
  }

  /**
   * Send a response to a channel
   */
  private async sendResponse(
    channel: TextChannel | DMChannel | ThreadChannel,
    content: string,
    replyTo?: string,
  ): Promise<string> {
    try {
      let sentMessage: Message

      if (replyTo) {
        // Try to reply to the specific message
        try {
          const originalMessage = await channel.messages.fetch(replyTo)
          sentMessage = await originalMessage.reply(content)
        } catch {
          // If we can't find the message to reply to, just send normally
          sentMessage = await channel.send(content)
        }
      } else {
        sentMessage = await channel.send(content)
      }

      return sentMessage.id
    } catch (error) {
      log.error({ err: error }, 'Error sending response')
      throw error
    }
  }

  /**
   * Send a status message with a Stop button as a reply to the original message
   */
  async sendStatusMessageWithButton(
    channel: TextChannel | DMChannel | ThreadChannel,
    content: string,
    executionId: string,
    replyTo?: string,
  ): Promise<string> {
    try {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`stop_execution:${executionId}`)
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger),
      )

      let sentMessage: Message
      const messageOptions = { content, components: [row] }

      if (replyTo) {
        try {
          const originalMessage = await channel.messages.fetch(replyTo)
          sentMessage = await originalMessage.reply(messageOptions)
        } catch {
          sentMessage = await channel.send(messageOptions)
        }
      } else {
        sentMessage = await channel.send(messageOptions)
      }

      return sentMessage.id
    } catch (error) {
      log.error({ err: error }, 'Error sending status message with button')
      throw error
    }
  }

  /**
   * Edit a status message (update text and optionally remove components)
   */
  async editStatusMessage(
    channelId: string,
    messageId: string,
    content: string,
    removeComponents: boolean = true,
  ): Promise<void> {
    if (!this.client || !this.isConnected) return

    try {
      const channel = await this.client.channels.fetch(channelId)
      if (!channel || !channel.isTextBased()) return

      const message = await (channel as TextChannel).messages.fetch(messageId)
      const editOptions: MessageEditOptions = { content }
      if (removeComponents) {
        editOptions.components = []
      }
      await message.edit(editOptions)
    } catch (error) {
      log.error({ err: error }, 'Error editing status message')
    }
  }

  /**
   * Clean message content - remove bot mention and trim
   */
  private cleanMessageContent(message: Message): string {
    let content = message.content

    // Remove bot mention (both <@!ID> and <@ID> formats)
    if (this.client?.user) {
      const mentionPattern = new RegExp(`<@!?${this.client.user.id}>`, 'g')
      content = content.replace(mentionPattern, '').trim()
    }

    return content
  }

  /**
   * Send a message to a specific channel
   */
  async sendToChannel(channelId: string, content: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      log.error('Not connected')
      return null
    }

    try {
      const channel = await this.client.channels.fetch(channelId)
      if (!channel || !channel.isTextBased()) {
        log.error('Invalid channel or not text-based')
        return null
      }

      const message = await (channel as TextChannel).send(content)
      return message.id
    } catch (error) {
      log.error({ err: error }, 'Error sending to channel')
      return null
    }
  }

  /**
   * Get information about connected guilds
   */
  getGuilds(): Array<{ id: string; name: string; memberCount: number }> {
    if (!this.client) return []

    return this.client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
    }))
  }

  /**
   * Check if the bot is in a specific guild
   */
  isInGuild(guildId: string): boolean {
    if (!this.client) return false
    return this.client.guilds.cache.has(guildId)
  }
}

// Export singleton instance
let discordBot: DiscordBot | null = null

export function getDiscordBot(): DiscordBot {
  if (!discordBot) {
    discordBot = new DiscordBot()
  }
  return discordBot
}

export function initializeDiscordBot(): DiscordBot {
  discordBot = new DiscordBot()
  return discordBot
}
