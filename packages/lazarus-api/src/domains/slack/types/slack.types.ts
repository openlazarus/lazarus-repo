import type { SlackFile } from '@domains/integration/types/integration.types'

export interface SlackConnection {
  id: string
  workspaceId: string
  slackTeamId: string
  slackTeamName?: string
  channelId?: string
  agentId?: string
  botToken: string
  botUserId?: string
  createdBy: string
  settings: SlackConnectionSettings
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SlackConnectionSettings {
  conversationTimeoutMinutes?: number
  respondToMentions?: boolean
  respondToDMs?: boolean
  useThreads?: boolean
  channelWhitelist?: string[]
  channelBlacklist?: string[]
}

export interface SlackMessage {
  teamId: string
  channelId: string
  threadTs?: string
  userId: string
  userName?: string
  text: string
  ts: string
  isMention?: boolean
  isDM?: boolean
  files?: SlackFile[]
  botId?: string // Present if message is from a bot
}

export interface CreateSlackConnectionOptions {
  slackTeamName?: string
  channelId?: string
  agentId?: string
  botUserId?: string
  settings?: SlackConnectionSettings
}

export interface SlackExecutionContext {
  executionId: string
  connectionId: string
  botToken: string
  channelId: string
  statusMessageTs?: string
  userId: string
}
