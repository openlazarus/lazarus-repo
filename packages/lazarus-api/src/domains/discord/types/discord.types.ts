import type { DiscordAttachment } from '@domains/integration/types/integration.types'

export interface DiscordConnection {
  id: string
  workspaceId: string
  guildId: string
  guildName?: string
  channelId?: string
  agentId?: string
  botUserId?: string
  webhookUrl?: string
  createdBy: string
  settings: DiscordConnectionSettings
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CapabilityConfig {
  enabled: boolean
  allowedBy: 'everyone' | 'roles'
  roleIds?: string[]
}

export type DiscordManagementCapability =
  | 'channel_create'
  | 'channel_delete'
  | 'channel_modify'
  | 'role_create'
  | 'role_delete'
  | 'role_modify'
  | 'role_assign'

export interface DiscordConnectionSettings {
  conversationTimeoutMinutes?: number
  respondToMentions?: boolean
  respondToDMs?: boolean
  useThreads?: boolean
  channelWhitelist?: string[]
  channelBlacklist?: string[]
  interactionAccess?: {
    allowedBy: 'everyone' | 'roles'
    roleIds?: string[]
  }
  managementCapabilities?: Record<DiscordManagementCapability, CapabilityConfig>
}

export interface DiscordMessage {
  messageId: string
  guildId: string | null
  channelId: string
  threadId?: string
  authorId: string
  authorName: string
  content: string
  mentionedBot: boolean
  isDM: boolean
  referencedMessageId?: string
  referencedContent?: string
  referencedAuthorName?: string
  attachments: DiscordAttachment[]
  memberRoleIds?: string[]
}

export interface CreateConnectionOptions {
  guildName?: string
  channelId?: string
  agentId?: string
  botUserId?: string
  webhookUrl?: string
  settings?: DiscordConnectionSettings
}

export interface DiscordExecutionContext {
  executionId: string
  channelId: string
  statusMessageId?: string
  userId: string
}

export interface DiscordBotConfig {
  token?: string
  applicationId?: string
}
