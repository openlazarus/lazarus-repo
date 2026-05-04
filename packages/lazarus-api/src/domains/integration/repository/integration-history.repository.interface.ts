export interface IIntegrationHistoryRepository {
  /** Get enabled Discord connections for a workspace. */
  getEnabledDiscordConnections(workspaceId: string): Promise<{ data: any; error: any }>
  /** Get enabled Slack connections for a workspace. */
  getEnabledSlackConnections(workspaceId: string): Promise<{ data: any; error: any }>
  /** Get Discord messages joined with their conversation data. */
  getDiscordMessagesWithConversation(
    connectionIds: string[],
    options: { channelId?: string; includeBotMessages?: boolean; limit: number },
  ): Promise<{ data: any; error: any }>
  /** Get Slack messages joined with their conversation data. */
  getSlackMessagesWithConversation(
    connectionIds: string[],
    options: { channelId?: string; includeBotMessages?: boolean; limit: number },
  ): Promise<{ data: any; error: any }>
  /** Get recent Discord conversations since a cutoff time. */
  getRecentDiscordConversations(
    connectionIds: string[],
    cutoff: string,
    limit: number,
  ): Promise<{ data: any; error: any }>
  /** Get recent Slack conversations since a cutoff time. */
  getRecentSlackConversations(
    connectionIds: string[],
    cutoff: string,
    limit: number,
  ): Promise<{ data: any; error: any }>
  /** Search Discord messages by content pattern. */
  searchDiscordMessages(
    connectionIds: string[],
    searchPattern: string,
    limit: number,
  ): Promise<{ data: any; error: any }>
  /** Search Slack messages by content pattern. */
  searchSlackMessages(
    connectionIds: string[],
    searchPattern: string,
    limit: number,
  ): Promise<{ data: any; error: any }>
  /** Get the bot token for a Slack connection. */
  getSlackConnectionBotToken(workspaceId: string): Promise<string | null>
}
