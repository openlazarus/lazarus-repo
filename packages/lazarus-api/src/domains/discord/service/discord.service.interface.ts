import type {
  CreateConnectionOptions,
  DiscordConnection,
  DiscordConnectionSettings,
  DiscordExecutionContext,
  DiscordMessage,
} from '@domains/discord/types/discord.types'

export interface IDiscordService {
  /** Maps executionId -> platform context for stop button handling. */
  executionContexts: Map<string, DiscordExecutionContext>

  /** Create a new Discord connection for a workspace. */
  createConnection(
    workspaceId: string,
    guildId: string,
    createdBy: string,
    options?: CreateConnectionOptions,
  ): Promise<DiscordConnection>

  /** Get a connection by its ID. */
  getConnection(connectionId: string): Promise<DiscordConnection | null>

  /** Get a connection by guild ID. */
  getConnectionByGuild(guildId: string): Promise<DiscordConnection | null>

  /** Get all connections for a workspace. */
  getConnectionsByWorkspace(workspaceId: string): Promise<DiscordConnection[]>

  /** Update a connection. */
  updateConnection(
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
  ): Promise<void>

  /** Delete a connection. */
  deleteConnection(connectionId: string): Promise<void>

  /** Process an incoming Discord message. */
  processMessage(
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
  ): Promise<void>

  /** Store a bot response message. */
  storeBotResponse(conversationId: string, messageId: string, content: string): Promise<void>
}
