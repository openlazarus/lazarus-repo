/**
 * Integration Manager
 *
 * Unified interface for managing Discord and Slack integrations.
 * Provides high-level operations for listing, connecting, and disconnecting integrations.
 */

import type {
  Integration,
  IntegrationPlatform,
  IntegrationStats,
  IntegrationType,
} from '@domains/integration/types/integration.types'
import type { DiscordConnection } from '../../discord/types/discord.types'
import type { SlackConnection } from '../../slack/types/slack.types'
import { discordService } from '@domains/discord/service/discord.service'
import { slackService } from '@domains/slack/service/slack.service'
import type { IDiscordService } from '@domains/discord/service/discord.service.interface'
import type { ISlackService } from '@domains/slack/service/slack.service.interface'
import { conversationDetector } from './conversation-detector'

export type { Integration, IntegrationStats, IntegrationType }

import type { IIntegrationManager } from './integration-manager.interface'

export class IntegrationManager implements IIntegrationManager {
  private discordService: IDiscordService
  private slackService: ISlackService

  constructor() {
    this.discordService = discordService
    this.slackService = slackService
  }

  // ============================================================================
  // Unified Operations
  // ============================================================================

  /**
   * Get all integrations for a workspace
   */
  async getWorkspaceIntegrations(workspaceId: string): Promise<Integration[]> {
    const [discordConnections, slackConnections] = await Promise.all([
      this.discordService.getConnectionsByWorkspace(workspaceId),
      this.slackService.getConnectionsByWorkspace(workspaceId),
    ])

    const integrations: Integration[] = [
      ...discordConnections.map((c) => this.mapDiscordToIntegration(c)),
      ...slackConnections.map((c) => this.mapSlackToIntegration(c)),
    ]

    // Sort by creation date, newest first
    return integrations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Get an integration by ID
   */
  async getIntegration(type: IntegrationType, connectionId: string): Promise<Integration | null> {
    if (type === 'discord') {
      const connection = await this.discordService.getConnection(connectionId)
      return connection ? this.mapDiscordToIntegration(connection) : null
    } else {
      const connection = await this.slackService.getConnection(connectionId)
      return connection ? this.mapSlackToIntegration(connection) : null
    }
  }

  /**
   * Disconnect an integration
   */
  async disconnectIntegration(type: IntegrationType, connectionId: string): Promise<void> {
    if (type === 'discord') {
      await this.discordService.deleteConnection(connectionId)
    } else {
      await this.slackService.deleteConnection(connectionId)
    }
  }

  /**
   * Enable or disable an integration
   */
  async setIntegrationEnabled(
    type: IntegrationType,
    connectionId: string,
    enabled: boolean,
  ): Promise<void> {
    if (type === 'discord') {
      await this.discordService.updateConnection(connectionId, { enabled })
    } else {
      await this.slackService.updateConnection(connectionId, { enabled })
    }
  }

  /**
   * Update the agent for an integration
   */
  async setIntegrationAgent(
    type: IntegrationType,
    connectionId: string,
    agentId: string,
  ): Promise<void> {
    if (type === 'discord') {
      await this.discordService.updateConnection(connectionId, { agentId })
    } else {
      await this.slackService.updateConnection(connectionId, { agentId })
    }
  }

  /**
   * Get integration statistics for a workspace
   */
  async getWorkspaceStats(workspaceId: string): Promise<IntegrationStats> {
    const integrations = await this.getWorkspaceIntegrations(workspaceId)

    return {
      totalConnections: integrations.length,
      activeConnections: integrations.filter((i) => i.enabled).length,
      byPlatform: {
        discord: integrations.filter((i) => i.type === 'discord').length,
        slack: integrations.filter((i) => i.type === 'slack').length,
      },
    }
  }

  // ============================================================================
  // Conversation Management
  // ============================================================================

  /**
   * Get recent conversations across all integrations
   */
  async getRecentConversations(
    workspaceId: string,
    options: {
      limit?: number
      platform?: IntegrationType
      daysBack?: number
    } = {},
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
  > {
    const integrations = await this.getWorkspaceIntegrations(workspaceId)
    const conversations: any[] = []

    // Filter by platform if specified
    const filteredIntegrations = options.platform
      ? integrations.filter((i) => i.type === options.platform)
      : integrations

    // Gather conversations from each integration
    for (const integration of filteredIntegrations) {
      const channelConversations = await conversationDetector.getChannelConversations(
        integration.type as IntegrationPlatform,
        integration.id,
        integration.metadata.channelId || '', // Empty = all channels
        { limit: options.limit || 50, includeThreads: true },
      )

      conversations.push(
        ...channelConversations.map((conv) => ({
          id: conv.id,
          platform: integration.type,
          connectionId: integration.id,
          channelId: '', // Would need to query this
          threadId: conv.threadId,
          messageCount: conv.messageCount,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
        })),
      )
    }

    // Sort by last message date and limit
    return conversations
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(0, options.limit || 100)
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    platform: IntegrationType,
    conversationId: string,
    limit: number = 50,
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
  > {
    return conversationDetector.getRecentMessages(
      platform as IntegrationPlatform,
      conversationId,
      limit,
    )
  }

  // ============================================================================
  // OAuth URLs
  // ============================================================================

  /**
   * Generate Discord OAuth URL for adding bot to server
   */
  getDiscordOAuthUrl(state: string, redirectUri?: string): string {
    const clientId = process.env.DISCORD_CLIENT_ID
    if (!clientId) {
      throw new Error('DISCORD_CLIENT_ID not configured')
    }

    const redirect = redirectUri || process.env.DISCORD_REDIRECT_URI
    if (!redirect) {
      throw new Error('DISCORD_REDIRECT_URI not configured')
    }

    // Required scopes for bot functionality
    const scopes = ['bot', 'applications.commands']

    // Bot permissions needed
    const permissions = [
      '2048', // Send Messages
      '64', // Add Reactions
      '16384', // Attach Files
      '32768', // Read Message History
      '4096', // Embed Links
      '1024', // Use Slash Commands (applications.commands)
    ].reduce((a, b) => (BigInt(a) | BigInt(b)).toString(), '0')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: scopes.join(' '),
      permissions,
      state,
    })

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`
  }

  /**
   * Generate Slack OAuth URL for installing app
   */
  getSlackOAuthUrl(state: string, redirectUri?: string): string {
    const clientId = process.env.SLACK_CLIENT_ID
    if (!clientId) {
      throw new Error('SLACK_CLIENT_ID not configured')
    }

    const redirect = redirectUri || process.env.SLACK_REDIRECT_URI
    if (!redirect) {
      throw new Error('SLACK_REDIRECT_URI not configured')
    }

    // Required scopes for bot functionality
    const scopes = [
      'app_mentions:read',
      'channels:history',
      'channels:read',
      'chat:write',
      'commands',
      'files:read',
      'im:history',
      'im:read',
      'im:write',
      'users:read',
    ]

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      scope: scopes.join(','),
      state,
    })

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapDiscordToIntegration(connection: DiscordConnection): Integration {
    return {
      id: connection.id,
      type: 'discord',
      workspaceId: connection.workspaceId,
      platformId: connection.guildId,
      platformName: connection.guildName,
      agentId: connection.agentId,
      enabled: connection.enabled,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      metadata: {
        channelId: connection.channelId,
        botUserId: connection.botUserId,
        settings: connection.settings,
      },
    }
  }

  private mapSlackToIntegration(connection: SlackConnection): Integration {
    return {
      id: connection.id,
      type: 'slack',
      workspaceId: connection.workspaceId,
      platformId: connection.slackTeamId,
      platformName: connection.slackTeamName,
      agentId: connection.agentId,
      enabled: connection.enabled,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      metadata: {
        channelId: connection.channelId,
        botUserId: connection.botUserId,
        settings: connection.settings,
      },
    }
  }
}

// Export singleton instance
export const integrationManager: IIntegrationManager = new IntegrationManager()
