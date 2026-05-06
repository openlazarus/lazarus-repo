import type { SlackConnectionRow, InsertSlackConnectionParams } from './slack.repository'

export interface ISlackRepository {
  /** Insert a new Slack connection. */
  insertConnection(params: InsertSlackConnectionParams): Promise<SlackConnectionRow>
  /** Find a connection by its ID. */
  findConnectionById(connectionId: string): Promise<SlackConnectionRow | null>
  /** Find an enabled connection by Slack team ID. */
  findConnectionByTeam(teamId: string): Promise<SlackConnectionRow | null>
  /** Find all connections for a workspace. */
  findConnectionsByWorkspace(workspaceId: string): Promise<SlackConnectionRow[]>
  /** Update a connection by ID. */
  updateConnection(connectionId: string, updates: Record<string, any>): Promise<void>
  /** Delete a connection by ID. */
  deleteConnection(connectionId: string): Promise<void>
}
