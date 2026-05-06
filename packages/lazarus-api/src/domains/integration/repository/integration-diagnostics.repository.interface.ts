export interface IIntegrationDiagnosticsRepository {
  /** Get Discord connections for a workspace. */
  getDiscordConnectionsForWorkspace(workspaceId: string): Promise<{ data: any; error: any }>
  /** Get Slack connections for a workspace. */
  getSlackConnectionsForWorkspace(workspaceId: string): Promise<{ data: any; error: any }>
  /** Get Discord connection IDs for a workspace. */
  getDiscordConnectionIds(workspaceId: string): Promise<{ data: any; error: any }>
  /** Get Slack connection IDs for a workspace. */
  getSlackConnectionIds(workspaceId: string): Promise<{ data: any; error: any }>
  /** Get recent Discord conversations by connection IDs. */
  getRecentDiscordConversations(
    connectionIds: string[],
    limit: number,
  ): Promise<{ data: any; error: any }>
  /** Get recent Slack conversations by connection IDs. */
  getRecentSlackConversations(
    connectionIds: string[],
    limit: number,
  ): Promise<{ data: any; error: any }>
  /** Get workspace settings by workspace ID. */
  getWorkspaceSettings(workspaceId: string): Promise<{ data: any; error: any }>
}
