import type { DiscordConnectionRow, InsertDiscordConnectionParams } from './discord.repository'

export interface IDiscordRepository {
  /** Insert a new Discord connection. */
  insertConnection(params: InsertDiscordConnectionParams): Promise<DiscordConnectionRow>
  /** Find a connection by its ID. */
  findConnectionById(connectionId: string): Promise<DiscordConnectionRow | null>
  /** Find an enabled connection by guild ID. */
  findConnectionByGuild(guildId: string): Promise<DiscordConnectionRow | null>
  /** Find all connections for a workspace. */
  findConnectionsByWorkspace(workspaceId: string): Promise<DiscordConnectionRow[]>
  /** Update a connection by ID. */
  updateConnection(connectionId: string, updates: Record<string, any>): Promise<void>
  /** Delete a connection by ID. */
  deleteConnection(connectionId: string): Promise<void>
}
