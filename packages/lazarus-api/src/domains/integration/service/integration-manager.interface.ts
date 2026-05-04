import type {
  Integration,
  IntegrationStats,
  IntegrationType,
} from '@domains/integration/types/integration.types'

export interface IIntegrationManager {
  /** Get all integrations for a workspace. */
  getWorkspaceIntegrations(workspaceId: string): Promise<Integration[]>

  /** Get an integration by ID. */
  getIntegration(type: IntegrationType, connectionId: string): Promise<Integration | null>

  /** Disconnect an integration. */
  disconnectIntegration(type: IntegrationType, connectionId: string): Promise<void>

  /** Enable or disable an integration. */
  setIntegrationEnabled(
    type: IntegrationType,
    connectionId: string,
    enabled: boolean,
  ): Promise<void>

  /** Update the agent for an integration. */
  setIntegrationAgent(type: IntegrationType, connectionId: string, agentId: string): Promise<void>

  /** Get integration statistics for a workspace. */
  getWorkspaceStats(workspaceId: string): Promise<IntegrationStats>

  /** Get recent conversations across all integrations. */
  getRecentConversations(
    workspaceId: string,
    options?: {
      limit?: number
      platform?: IntegrationType
      daysBack?: number
    },
  ): Promise<
    Array<{
      id: string
      platform: IntegrationType
      connectionId: string
      channelId: string
      threadId?: string
      messageCount: number
      lastMessageAt: Date
      createdAt: Date
    }>
  >

  /** Get messages for a conversation. */
  getConversationMessages(
    platform: IntegrationType,
    conversationId: string,
    limit?: number,
  ): Promise<
    Array<{
      id: string
      authorId: string
      authorName: string | null
      content: string
      isFromBot: boolean
      attachments: any[]
      createdAt: Date
    }>
  >

  /** Generate Discord OAuth URL for adding bot to server. */
  getDiscordOAuthUrl(state: string, redirectUri?: string): string

  /** Generate Slack OAuth URL for installing app. */
  getSlackOAuthUrl(state: string, redirectUri?: string): string
}
