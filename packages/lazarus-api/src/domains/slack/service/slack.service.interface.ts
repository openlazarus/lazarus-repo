import type { WebClient } from '@slack/web-api'
import type {
  CreateSlackConnectionOptions,
  SlackConnection,
  SlackConnectionSettings,
  SlackExecutionContext,
  SlackMessage,
} from '@domains/slack/types/slack.types'

export interface ISlackService {
  /** Maps executionId -> platform context for stop button handling */
  executionContexts: Map<string, SlackExecutionContext>

  getClient(connectionId: string, botToken?: string): WebClient

  removeClient(connectionId: string): void

  createConnection(
    workspaceId: string,
    slackTeamId: string,
    botToken: string,
    createdBy: string,
    options?: CreateSlackConnectionOptions,
  ): Promise<SlackConnection>

  getConnection(connectionId: string): Promise<SlackConnection | null>

  getConnectionByTeam(teamId: string): Promise<SlackConnection | null>

  getConnectionsByWorkspace(workspaceId: string): Promise<SlackConnection[]>

  updateConnection(
    connectionId: string,
    updates: Partial<{
      slackTeamName: string
      channelId: string
      agentId: string
      botUserId: string
      settings: SlackConnectionSettings
      enabled: boolean
    }>,
  ): Promise<void>

  deleteConnection(connectionId: string): Promise<void>

  processMessage(message: SlackMessage): Promise<void>

  sendMessage(
    connectionId: string,
    botToken: string,
    channelId: string,
    text: string,
    threadTs?: string,
  ): Promise<string | undefined>

  sendBlocks(
    connectionId: string,
    botToken: string,
    channelId: string,
    blocks: any[],
    text: string,
    threadTs?: string,
  ): Promise<string | undefined>

  updateMessage(
    connectionId: string,
    botToken: string,
    channelId: string,
    ts: string,
    text: string,
  ): Promise<void>

  updateMessageBlocks(
    connectionId: string,
    botToken: string,
    channelId: string,
    ts: string,
    text: string,
    blocks: any[],
  ): Promise<void>

  addReaction(
    connectionId: string,
    botToken: string,
    channelId: string,
    ts: string,
    emoji: string,
  ): Promise<void>

  formatForSlack(markdown: string): string

  buildResponseBlocks(content: string, metadata?: { title?: string; agentName?: string }): any[]

  storeBotResponse(conversationId: string, ts: string, content: string): Promise<void>

  getUserInfo(
    connectionId: string,
    botToken: string,
    userId: string,
  ): Promise<{ name: string; realName?: string; email?: string } | null>
}
