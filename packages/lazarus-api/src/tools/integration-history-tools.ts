/**
 * Integration History Tools for Claude Code Agents
 *
 * These MCP tools allow Lazarus agents to query message history from
 * Discord and Slack conversations when users ask about past interactions.
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { integrationHistoryRepository } from '@domains/integration/repository/integration-history.repository'
import { createLogger } from '@utils/logger'

const log = createLogger('integration-history-tools')

/**
 * Tool: Get Recent Discord Messages
 * Retrieves recent messages from Discord conversations
 */
const getRecentDiscordMessages = tool(
  'get_recent_discord_messages',
  'Retrieve recent messages from Discord conversations. Use this when a user asks about past Discord conversations or wants to recall what was discussed.',
  {
    channel_id: z.string().optional().describe('Discord channel ID to filter by (optional)'),
    limit: z.number().default(50).describe('Maximum number of messages to retrieve (default 50)'),
    include_bot_messages: z.boolean().default(true).describe('Include bot responses in results'),
  },
  async (args) => {
    log.info({ tool: 'get_recent_discord_messages', args }, 'tool called')

    try {
      // Get workspace ID from environment (set by agent executor)
      const workspaceId = getExecutionContext().workspaceId
      if (!workspaceId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Workspace context not available',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const { data: connections, error: connError } =
        await integrationHistoryRepository.getEnabledDiscordConnections(workspaceId)

      if (connError || !connections || connections.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: 'No Discord connections found for this workspace',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const { data: messages, error } =
        await integrationHistoryRepository.getDiscordMessagesWithConversation(
          connections.map((c: any) => c.id),
          {
            channelId: args.channel_id,
            includeBotMessages: args.include_bot_messages,
            limit: args.limit,
          },
        )

      if (error) {
        log.error(
          { err: error, tool: 'get_recent_discord_messages' },
          'Discord messages query failed',
        )
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error.message,
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Format messages for display
      const formattedMessages = (messages || []).map((msg: any) => ({
        author: msg.author_name || msg.author_id,
        content: msg.content,
        timestamp: msg.created_at,
        isBot: msg.is_from_bot,
        channelId: (msg.discord_conversations as any)?.channel_id,
        hasAttachments:
          msg.attachments && JSON.parse((msg.attachments as string) || '[]').length > 0,
      }))

      log.info(
        { tool: 'get_recent_discord_messages', messageCount: formattedMessages.length },
        'retrieved Discord messages',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                platform: 'discord',
                messageCount: formattedMessages.length,
                messages: formattedMessages,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'get_recent_discord_messages' }, 'unexpected error')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                messages: [],
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  },
)

/**
 * Tool: Get Recent Slack Messages
 * Retrieves recent messages from Slack conversations
 */
const getRecentSlackMessages = tool(
  'get_recent_slack_messages',
  'Retrieve recent messages from Slack conversations. Use this when a user asks about past Slack conversations or wants to recall what was discussed.',
  {
    channel_id: z.string().optional().describe('Slack channel ID to filter by (optional)'),
    limit: z.number().default(50).describe('Maximum number of messages to retrieve (default 50)'),
    include_bot_messages: z.boolean().default(true).describe('Include bot responses in results'),
  },
  async (args) => {
    log.info({ tool: 'get_recent_slack_messages', args }, 'tool called')

    try {
      const workspaceId = getExecutionContext().workspaceId
      if (!workspaceId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Workspace context not available',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const { data: connections, error: connError } =
        await integrationHistoryRepository.getEnabledSlackConnections(workspaceId)

      if (connError || !connections || connections.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: 'No Slack connections found for this workspace',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const { data: messages, error } =
        await integrationHistoryRepository.getSlackMessagesWithConversation(
          connections.map((c: any) => c.id),
          {
            channelId: args.channel_id,
            includeBotMessages: args.include_bot_messages,
            limit: args.limit,
          },
        )

      if (error) {
        log.error({ err: error, tool: 'get_recent_slack_messages' }, 'Slack messages query failed')
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error.message,
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const formattedMessages = (messages || []).map((msg: any) => ({
        author: msg.user_name || msg.user_id,
        content: msg.content,
        timestamp: msg.created_at,
        isBot: msg.is_from_bot,
        channelId: (msg.slack_conversations as any)?.channel_id,
        hasAttachments:
          msg.attachments && JSON.parse((msg.attachments as string) || '[]').length > 0,
      }))

      log.info(
        { tool: 'get_recent_slack_messages', messageCount: formattedMessages.length },
        'retrieved Slack messages',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                platform: 'slack',
                messageCount: formattedMessages.length,
                messages: formattedMessages,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'get_recent_slack_messages' }, 'unexpected error')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                messages: [],
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  },
)

/**
 * Tool: List Recent Integration Conversations
 * Lists recent conversations from Discord and/or Slack
 */
const listRecentConversations = tool(
  'list_recent_conversations',
  'List recent conversations from Discord or Slack integrations. Useful for getting an overview of recent activity across messaging platforms.',
  {
    platform: z
      .enum(['discord', 'slack', 'all'])
      .default('all')
      .describe('Platform to query: discord, slack, or all'),
    days_back: z.number().default(7).describe('Number of days to look back (default 7)'),
    limit: z.number().default(20).describe('Maximum number of conversations to return'),
  },
  async (args) => {
    log.info({ tool: 'list_recent_conversations', args }, 'tool called')

    try {
      const workspaceId = getExecutionContext().workspaceId
      if (!workspaceId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Workspace context not available',
                  conversations: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const cutoff = new Date(Date.now() - args.days_back * 24 * 60 * 60 * 1000).toISOString()
      const conversations: any[] = []

      if (args.platform === 'discord' || args.platform === 'all') {
        const { data: discordConns } =
          await integrationHistoryRepository.getEnabledDiscordConnections(workspaceId)

        if (discordConns && discordConns.length > 0) {
          const { data: discordConvs } =
            await integrationHistoryRepository.getRecentDiscordConversations(
              discordConns.map((c: any) => c.id),
              cutoff,
              args.limit,
            )

          if (discordConvs) {
            conversations.push(
              ...discordConvs.map((conv: any) => ({
                id: conv.id,
                platform: 'discord',
                channelId: conv.channel_id,
                threadId: conv.thread_id,
                messageCount: conv.message_count,
                createdAt: conv.created_at,
                lastActivity: conv.last_message_at,
              })),
            )
          }
        }
      }

      if (args.platform === 'slack' || args.platform === 'all') {
        const { data: slackConns } =
          await integrationHistoryRepository.getEnabledSlackConnections(workspaceId)

        if (slackConns && slackConns.length > 0) {
          const { data: slackConvs } =
            await integrationHistoryRepository.getRecentSlackConversations(
              slackConns.map((c: any) => c.id),
              cutoff,
              args.limit,
            )

          if (slackConvs) {
            conversations.push(
              ...slackConvs.map((conv: any) => ({
                id: conv.id,
                platform: 'slack',
                channelId: conv.channel_id,
                threadTs: conv.thread_ts,
                messageCount: conv.message_count,
                createdAt: conv.created_at,
                lastActivity: conv.last_message_at,
              })),
            )
          }
        }
      }

      // Sort by last activity and limit
      conversations.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
      )
      const limited = conversations.slice(0, args.limit)

      log.info(
        { tool: 'list_recent_conversations', conversationCount: limited.length },
        'listed conversations',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                platform: args.platform,
                daysBack: args.days_back,
                conversationCount: limited.length,
                conversations: limited,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'list_recent_conversations' }, 'unexpected error')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                conversations: [],
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  },
)

/**
 * Tool: Search Integration Messages
 * Search messages across Discord and Slack by content
 */
const searchIntegrationMessages = tool(
  'search_integration_messages',
  'Search for messages containing specific keywords across Discord and Slack conversations. Use this when a user asks about something specific that was discussed.',
  {
    query: z.string().describe('Search query - will match against message content'),
    platform: z
      .enum(['discord', 'slack', 'all'])
      .default('all')
      .describe('Platform to search: discord, slack, or all'),
    limit: z.number().default(20).describe('Maximum number of results'),
  },
  async (args) => {
    log.info({ tool: 'search_integration_messages', args }, 'tool called')

    try {
      const workspaceId = getExecutionContext().workspaceId
      if (!workspaceId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Workspace context not available',
                  results: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const results: any[] = []
      const searchPattern = `%${args.query}%`

      if (args.platform === 'discord' || args.platform === 'all') {
        const { data: discordConns } =
          await integrationHistoryRepository.getEnabledDiscordConnections(workspaceId)

        if (discordConns && discordConns.length > 0) {
          const { data: discordMsgs } = await integrationHistoryRepository.searchDiscordMessages(
            discordConns.map((c: any) => c.id),
            searchPattern,
            args.limit,
          )

          if (discordMsgs) {
            results.push(
              ...discordMsgs.map((msg: any) => ({
                platform: 'discord',
                author: msg.author_name,
                content: msg.content,
                timestamp: msg.created_at,
                isBot: msg.is_from_bot,
                channelId: (msg.discord_conversations as any)?.channel_id,
              })),
            )
          }
        }
      }

      if (args.platform === 'slack' || args.platform === 'all') {
        const { data: slackConns } =
          await integrationHistoryRepository.getEnabledSlackConnections(workspaceId)

        if (slackConns && slackConns.length > 0) {
          const { data: slackMsgs } = await integrationHistoryRepository.searchSlackMessages(
            slackConns.map((c: any) => c.id),
            searchPattern,
            args.limit,
          )

          if (slackMsgs) {
            results.push(
              ...slackMsgs.map((msg: any) => ({
                platform: 'slack',
                author: msg.user_name,
                content: msg.content,
                timestamp: msg.created_at,
                isBot: msg.is_from_bot,
                channelId: (msg.slack_conversations as any)?.channel_id,
              })),
            )
          }
        }
      }

      // Sort by timestamp and limit
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const limited = results.slice(0, args.limit)

      log.info(
        { tool: 'search_integration_messages', resultCount: limited.length, query: args.query },
        'search completed',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                query: args.query,
                platform: args.platform,
                resultCount: limited.length,
                results: limited,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'search_integration_messages' }, 'unexpected error')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                results: [],
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  },
)

/**
 * Create MCP server with all integration history tools
 */
export const integrationHistoryToolsServer = createSdkMcpServer({
  name: 'integration-history-tools',
  tools: [
    getRecentDiscordMessages,
    getRecentSlackMessages,
    listRecentConversations,
    searchIntegrationMessages,
  ],
})

// Export individual tools for testing
export {
  getRecentDiscordMessages,
  getRecentSlackMessages,
  listRecentConversations,
  searchIntegrationMessages,
}
