export interface IDiscordBot {
  /** Check if the bot is configured and can be started. */
  isConfigured(): boolean

  /** Initialize and connect the Discord bot. */
  start(): Promise<void>

  /** Disconnect the Discord bot. */
  stop(): Promise<void>

  /** Get bot status. */
  getStatus(): { connected: boolean; guilds: number; username?: string }

  /** Send a message to a specific channel. */
  sendToChannel(channelId: string, content: string): Promise<string | null>

  /** Get information about connected guilds. */
  getGuilds(): Array<{ id: string; name: string; memberCount: number }>

  /** Check if the bot is in a specific guild. */
  isInGuild(guildId: string): boolean
}
