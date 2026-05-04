/**
 * Shared types for Discord/Slack integration services.
 */

export type IntegrationType = 'discord' | 'slack'

export interface Integration {
  id: string
  type: IntegrationType
  workspaceId: string
  platformId: string // guildId for Discord, teamId for Slack
  platformName?: string
  agentId?: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
  metadata: {
    channelId?: string
    botUserId?: string
    settings?: Record<string, any>
  }
}

export interface IntegrationStats {
  totalConnections: number
  activeConnections: number
  byPlatform: {
    discord: number
    slack: number
  }
}

export type IntegrationPlatform = 'discord' | 'slack'

export interface ConversationContext {
  id: string
  connectionId: string
  channelId: string
  threadId?: string | null
  sessionId?: string | null
  conversationId?: string | null
  isNewConversation: boolean
  messageCount: number
  lastMessageAt: Date
}

export interface ConversationDetectorConfig {
  timeoutMinutes?: number
}

export interface DiscordAttachment {
  id: string
  filename: string
  url: string
  proxy_url?: string
  content_type?: string
  size: number
  width?: number
  height?: number
}

export interface SlackFile {
  id: string
  name: string
  title?: string
  mimetype: string
  filetype: string
  size: number
  url_private: string
  url_private_download?: string
  thumb_360?: string
  thumb_480?: string
  thumb_720?: string
}

export interface ProcessedAttachment {
  id: string
  originalUrl: string
  storagePath?: string
  filename: string
  contentType: string
  size: number
  width?: number
  height?: number
  platform: 'discord' | 'slack'
}

export interface AttachmentMetadata {
  id: string
  originalUrl: string
  filename: string
  contentType: string
  size: number
  width?: number
  height?: number
  platform: 'discord' | 'slack'
  platformId: string
  workspaceId: string
  createdAt: string
}
