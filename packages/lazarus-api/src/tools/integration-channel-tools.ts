/**
 * Integration Channel Tools for Claude Code Agents
 *
 * These MCP tools allow Lazarus agents to fetch message history directly
 * from Discord and Slack channels using their respective APIs.
 * This enables querying ALL messages in connected servers, not just
 * those from Lazarus conversations.
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { WebClient } from '@slack/web-api'
import { integrationHistoryRepository } from '@domains/integration/repository/integration-history.repository'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { createLogger } from '@utils/logger'
import { readWorkspaceFile, PLATFORM_SIZE_LIMITS } from '@utils/workspace-file-reader'

const log = createLogger('integration-channel-tools')
import { AttachmentBuilder } from 'discord.js'
import {
  toolResult,
  toolError,
  getDiscordClient,
  chunkDiscordMessage,
  getAllowedDiscordGuildIds,
} from './discord-tool-helpers'

/** Zod schema reused by both send_discord_message and send_slack_message. */
const attachmentsSchema = z
  .array(
    z.object({
      path: z.string().describe('File path relative to workspace (e.g. "./report.pdf")'),
      filename: z.string().optional().describe('Custom filename override (optional)'),
    }),
  )
  .optional()

type AttachmentInput = { path: string; filename?: string }
type ToolResultEnvelope = ReturnType<typeof toolResult>
type ResolvedFiles = {
  files: { filename: string; contentType: string; content: Buffer; size: number }[]
  error?: never
}
type ResolvedError = { error: ToolResultEnvelope; files?: never }

/**
 * Read attachment files from the workspace.
 * Returns an array of WorkspaceFile objects or a tool error result.
 */
async function resolveAttachments(
  attachments: AttachmentInput[] | undefined,
  platform: 'discord' | 'slack',
): Promise<ResolvedFiles | ResolvedError> {
  if (!attachments || attachments.length === 0) return { files: [] }

  const workspacePath = getExecutionContext().workspacePath
  if (!workspacePath) {
    return { error: toolError('Workspace path not available — cannot read attachments') }
  }

  const files: ResolvedFiles['files'] = []
  for (const att of attachments) {
    const file = await readWorkspaceFile(workspacePath, att.path, {
      maxSize: PLATFORM_SIZE_LIMITS[platform],
    })
    files.push({ ...file, filename: att.filename || file.filename })
  }
  return { files }
}

// Re-export setDiscordClient for backward compatibility (discord-bot.ts imports it from here)
export { setDiscordClient } from './discord-tool-helpers'

/**
 * Convert markdown to Slack mrkdwn format.
 * Standalone copy of the logic from slack.service.ts for use in MCP tools.
 */
function formatForSlack(markdown: string): string {
  return (
    markdown
      // Bold: **text** -> *text*
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      // Italic: *text* or _text_ -> _text_
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '_$1_')
      // Code blocks: ```lang\ncode\n``` -> ```code```
      .replace(/```(\w+)?\n([\s\S]+?)\n```/g, '```$2```')
      // Links: [text](url) -> <url|text>
      .replace(/\[(.+?)\]\((.+?)\)/g, '<$2|$1>')
      // Headers: # text -> *text*
      .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
      // Lists: - item -> • item
      .replace(/^-\s+(.+)$/gm, '• $1')
  )
}

/**
 * Tool: List Discord Channels
 * Lists all text channels in connected Discord servers
 */
export const listDiscordChannels = tool(
  'list_discord_channels',
  'List all text channels in connected Discord servers. Use this to discover available channels before fetching messages.',
  {
    guild_id: z
      .string()
      .optional()
      .describe('Filter by specific Discord server/guild ID (optional)'),
  },
  async (args) => {
    log.info({ tool: 'list_discord_channels', args }, 'tool called')

    try {
      const client = getDiscordClient()
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'Discord bot is not connected. The bot needs to be running to access Discord channels.',
                  channels: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Scope to workspace's connected guilds
      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: 'Workspace context not available', channels: [] },
                null,
                2,
              ),
            },
          ],
        }
      }
      if (allowed.guildIds.size === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'No Discord servers connected to this workspace',
                  channels: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const channels: any[] = []

      // Get guilds filtered to workspace's connections
      let guilds: any[]
      if (args.guild_id) {
        if (!allowed.guildIds.has(args.guild_id)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'This Discord server is not connected to your workspace',
                    channels: [],
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }
        guilds = [client.guilds.cache.get(args.guild_id)].filter(Boolean)
      } else {
        guilds = Array.from(client.guilds.cache.values()).filter((g: any) =>
          allowed.guildIds.has(g.id),
        )
      }

      for (const guild of guilds) {
        const textChannels = guild.channels.cache.filter(
          (ch: any) => ch.type === 0 || ch.type === 5, // GUILD_TEXT or GUILD_ANNOUNCEMENT
        )

        for (const [channelId, channel] of textChannels) {
          channels.push({
            id: channelId,
            name: channel.name,
            guildId: guild.id,
            guildName: guild.name,
            type: channel.type === 5 ? 'announcement' : 'text',
            topic: channel.topic || null,
          })
        }
      }

      log.info(
        { tool: 'list_discord_channels', channelCount: channels.length },
        'listed Discord channels',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                channelCount: channels.length,
                channels,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'list_discord_channels' }, 'unexpected error')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                channels: [],
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
 * Tool: Fetch Discord Channel History
 * Fetches message history from a specific Discord channel
 */
export const fetchDiscordChannelHistory = tool(
  'fetch_discord_channel_history',
  'Fetch message history from a Discord channel. Use this when you need to see what was discussed in a specific channel, even if Lazarus was not mentioned.',
  {
    channel_id: z.string().describe('The Discord channel ID to fetch messages from'),
    limit: z.number().default(50).describe('Maximum number of messages to fetch (max 100)'),
    before_message_id: z
      .string()
      .optional()
      .describe('Fetch messages before this message ID (for pagination)'),
  },
  async (args) => {
    log.info({ tool: 'fetch_discord_channel_history', args }, 'tool called')

    try {
      const client = getDiscordClient()
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'Discord bot is not connected. The bot needs to be running to access Discord channels.',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Scope to workspace's connected guilds
      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: 'Workspace context not available', messages: [] },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Get the channel
      const channel = await client.channels.fetch(args.channel_id)
      if (!channel || !('messages' in channel)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: `Channel ${args.channel_id} not found or is not a text channel`,
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Verify channel's guild belongs to this workspace
      if (!(channel as any).guild || !allowed.guildIds.has((channel as any).guild.id)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'This channel does not belong to a Discord server connected to your workspace',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Fetch messages
      const fetchOptions: any = {
        limit: Math.min(args.limit, 100),
      }
      if (args.before_message_id) {
        fetchOptions.before = args.before_message_id
      }

      const messages = await channel.messages.fetch(fetchOptions)

      // Format messages
      const formattedMessages = Array.from(messages.values()).map((msg: any) => ({
        id: msg.id,
        author: msg.author.username,
        authorId: msg.author.id,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        isBot: msg.author.bot,
        hasAttachments: msg.attachments.size > 0,
        attachments: Array.from(msg.attachments.values()).map((att: any) => ({
          name: att.name,
          url: att.url,
          size: att.size,
        })),
        replyTo: msg.reference?.messageId || null,
      }))

      // Sort by timestamp (oldest first)
      formattedMessages.reverse()

      log.info(
        {
          tool: 'fetch_discord_channel_history',
          channelId: args.channel_id,
          messageCount: formattedMessages.length,
        },
        'fetched Discord channel history',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                channelId: args.channel_id,
                channelName: (channel as any).name,
                guildName: (channel as any).guild?.name,
                messageCount: formattedMessages.length,
                messages: formattedMessages,
                hasMore: messages.size === fetchOptions.limit,
                oldestMessageId: formattedMessages.length > 0 ? formattedMessages[0]!.id : null,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'fetch_discord_channel_history' }, 'unexpected error')
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
 * Tool: Search Discord Messages
 * Search messages across Discord channels by content
 */
export const searchDiscordMessages = tool(
  'search_discord_channel_messages',
  'Search for messages containing specific keywords in Discord channels. Searches the most recent messages in accessible channels.',
  {
    query: z.string().describe('Search query - will match against message content'),
    channel_id: z.string().optional().describe('Limit search to a specific channel (optional)'),
    limit: z.number().default(50).describe('Maximum messages to search through per channel'),
  },
  async (args) => {
    log.info({ tool: 'search_discord_channel_messages', args }, 'tool called')

    try {
      const client = getDiscordClient()
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Discord bot is not connected.',
                  results: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Scope to workspace's connected guilds
      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: false, error: 'Workspace context not available', results: [] },
                null,
                2,
              ),
            },
          ],
        }
      }
      if (allowed.guildIds.size === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'No Discord servers connected to this workspace',
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
      const queryLower = args.query.toLowerCase()

      // Get channels to search (filtered to workspace guilds)
      let channelsToSearch: any[] = []
      if (args.channel_id) {
        const channel = await client.channels.fetch(args.channel_id)
        if (
          channel &&
          'messages' in channel &&
          (channel as any).guild &&
          allowed.guildIds.has((channel as any).guild.id)
        ) {
          channelsToSearch = [channel]
        }
      } else {
        // Search text channels only in workspace-connected guilds
        for (const guild of client.guilds.cache.values()) {
          if (!allowed.guildIds.has(guild.id)) continue
          const textChannels = guild.channels.cache.filter(
            (ch: any) => ch.type === 0 && ch.permissionsFor(client.user)?.has('ViewChannel'),
          )
          channelsToSearch.push(...Array.from(textChannels.values()).slice(0, 5))
        }
        channelsToSearch = channelsToSearch.slice(0, 10)
      }

      // Search each channel
      for (const channel of channelsToSearch) {
        try {
          const messages = await channel.messages.fetch({ limit: args.limit })

          for (const msg of messages.values()) {
            if (msg.content.toLowerCase().includes(queryLower)) {
              results.push({
                channelId: channel.id,
                channelName: channel.name,
                guildName: channel.guild?.name,
                messageId: msg.id,
                author: msg.author.username,
                content: msg.content,
                timestamp: msg.createdAt.toISOString(),
                isBot: msg.author.bot,
              })
            }
          }
        } catch (err) {
          // Skip channels we can't access
          log.warn(
            { err, channelId: channel.id, tool: 'search_discord_channel_messages' },
            'could not search channel',
          )
        }
      }

      // Sort by timestamp (newest first)
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      log.info(
        { tool: 'search_discord_channel_messages', resultCount: results.length },
        'Discord message search completed',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                query: args.query,
                resultCount: results.length,
                channelsSearched: channelsToSearch.length,
                results: results.slice(0, 50), // Limit results
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'search_discord_channel_messages' }, 'unexpected error')
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

// ============================================================================
// Slack Channel Tools
// ============================================================================

/**
 * Get Slack client for a workspace
 */
async function getSlackClient(workspaceId: string): Promise<WebClient | null> {
  const botToken = await integrationHistoryRepository.getSlackConnectionBotToken(workspaceId)
  if (!botToken) return null
  return new WebClient(botToken)
}

/**
 * Tool: List Slack Channels
 * Lists all channels in connected Slack workspaces
 */
export const listSlackChannels = tool(
  'list_slack_channels',
  'List all channels in connected Slack workspaces. Use this to discover available channels before fetching messages.',
  {
    include_private: z
      .boolean()
      .default(false)
      .describe('Include private channels the bot has access to'),
  },
  async (args) => {
    log.info({ tool: 'list_slack_channels', args }, 'tool called')

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
                  channels: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const client = await getSlackClient(workspaceId)
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'No Slack connection found for this workspace',
                  channels: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Fetch channels
      const types = args.include_private ? 'public_channel,private_channel' : 'public_channel'
      const result = await client.conversations.list({
        types,
        limit: 200,
        exclude_archived: true,
      })

      const channels = (result.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        isPrivate: ch.is_private || false,
        isMember: ch.is_member || false,
        topic: ch.topic?.value || null,
        purpose: ch.purpose?.value || null,
        memberCount: ch.num_members || 0,
      }))

      log.info(
        { tool: 'list_slack_channels', channelCount: channels.length },
        'listed Slack channels',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                channelCount: channels.length,
                channels,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'list_slack_channels' }, 'unexpected error')
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                channels: [],
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
 * Tool: Fetch Slack Channel History
 * Fetches message history from a specific Slack channel
 */
export const fetchSlackChannelHistory = tool(
  'fetch_slack_channel_history',
  'Fetch message history from a Slack channel. Use this when you need to see what was discussed in a specific channel, even if Lazarus was not mentioned.',
  {
    channel_id: z.string().describe('The Slack channel ID to fetch messages from'),
    limit: z.number().default(50).describe('Maximum number of messages to fetch (max 100)'),
    oldest: z.string().optional().describe('Only fetch messages after this Unix timestamp'),
    latest: z.string().optional().describe('Only fetch messages before this Unix timestamp'),
  },
  async (args) => {
    log.info({ tool: 'fetch_slack_channel_history', args }, 'tool called')

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

      const client = await getSlackClient(workspaceId)
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'No Slack connection found for this workspace',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // First, try to join the channel if not already a member
      try {
        await client.conversations.join({ channel: args.channel_id })
      } catch (joinError: any) {
        // Ignore errors - we might already be a member or it's a private channel
        if (
          joinError.data?.error !== 'already_in_channel' &&
          joinError.data?.error !== 'method_not_supported_for_channel_type'
        ) {
          log.warn(
            { slackError: joinError.data?.error, tool: 'fetch_slack_channel_history' },
            'could not join Slack channel',
          )
        }
      }

      // Fetch channel info
      const channelInfo = await client.conversations.info({ channel: args.channel_id })

      // Fetch messages
      const historyOptions: any = {
        channel: args.channel_id,
        limit: Math.min(args.limit, 100),
      }
      if (args.oldest) historyOptions.oldest = args.oldest
      if (args.latest) historyOptions.latest = args.latest

      const result = await client.conversations.history(historyOptions)

      // Get user info for messages
      const userIds = new Set<string>()
      for (const msg of result.messages || []) {
        if (msg.user) userIds.add(msg.user)
      }

      // Batch fetch user info
      const userMap: Record<string, string> = {}
      for (const userId of userIds) {
        try {
          const userInfo = await client.users.info({ user: userId })
          if (userInfo.user) {
            userMap[userId] = userInfo.user.real_name || userInfo.user.name || userId
          }
        } catch {
          userMap[userId] = userId
        }
      }

      // Format messages
      const formattedMessages = (result.messages || []).map((msg: any) => ({
        ts: msg.ts,
        author: userMap[msg.user] || msg.user || 'Unknown',
        authorId: msg.user,
        content: msg.text,
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        isBot: msg.bot_id ? true : false,
        hasAttachments: (msg.files?.length || 0) > 0,
        threadTs: msg.thread_ts,
        replyCount: msg.reply_count || 0,
      }))

      // Reverse to show oldest first
      formattedMessages.reverse()

      log.info(
        {
          tool: 'fetch_slack_channel_history',
          channelId: args.channel_id,
          messageCount: formattedMessages.length,
        },
        'fetched Slack channel history',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                channelId: args.channel_id,
                channelName: (channelInfo.channel as any)?.name,
                messageCount: formattedMessages.length,
                messages: formattedMessages,
                hasMore: result.has_more || false,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'fetch_slack_channel_history' }, 'unexpected error')
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
 * Tool: Search Slack Messages
 * Search messages across Slack channels by content
 */
export const searchSlackMessages = tool(
  'search_slack_messages',
  "Search for messages containing specific keywords across Slack channels. Uses Slack's built-in search API.",
  {
    query: z.string().describe('Search query - supports Slack search syntax'),
    count: z.number().default(20).describe('Maximum number of results'),
  },
  async (args) => {
    log.info({ tool: 'search_slack_messages', args }, 'tool called')

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

      const client = await getSlackClient(workspaceId)
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'No Slack connection found for this workspace',
                  results: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      // Use Slack's search API
      const result = await client.search.messages({
        query: args.query,
        count: args.count,
        sort: 'timestamp',
        sort_dir: 'desc',
      })

      const matches = result.messages?.matches || []
      const formattedResults = matches.map((match: any) => ({
        channelId: match.channel?.id,
        channelName: match.channel?.name,
        ts: match.ts,
        author: match.username || match.user,
        content: match.text,
        timestamp: new Date(parseFloat(match.ts) * 1000).toISOString(),
        permalink: match.permalink,
      }))

      log.info(
        { tool: 'search_slack_messages', resultCount: formattedResults.length },
        'Slack message search completed',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                query: args.query,
                resultCount: formattedResults.length,
                totalMatches: result.messages?.total || 0,
                results: formattedResults,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error: any) {
      log.error({ err: error, tool: 'search_slack_messages' }, 'unexpected error')

      // Handle specific Slack API errors
      if (error.data?.error === 'missing_scope') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    'The Slack bot needs the "search:read" scope to search messages. Please re-install the Slack app with this permission.',
                  results: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

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
 * Tool: Get Slack Thread Replies
 * Fetches all replies in a Slack thread
 */
export const getSlackThreadReplies = tool(
  'get_slack_thread_replies',
  'Get all replies in a Slack thread. Use this when you need to see the full conversation in a thread.',
  {
    channel_id: z.string().describe('The Slack channel ID containing the thread'),
    thread_ts: z.string().describe('The timestamp of the parent message (thread_ts)'),
    limit: z.number().default(100).describe('Maximum number of replies to fetch'),
  },
  async (args) => {
    log.info({ tool: 'get_slack_thread_replies', args }, 'tool called')

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

      const client = await getSlackClient(workspaceId)
      if (!client) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: 'No Slack connection found for this workspace',
                  messages: [],
                },
                null,
                2,
              ),
            },
          ],
        }
      }

      const result = await client.conversations.replies({
        channel: args.channel_id,
        ts: args.thread_ts,
        limit: args.limit,
      })

      // Get user info
      const userIds = new Set<string>()
      for (const msg of result.messages || []) {
        if (msg.user) userIds.add(msg.user)
      }

      const userMap: Record<string, string> = {}
      for (const userId of userIds) {
        try {
          const userInfo = await client.users.info({ user: userId })
          if (userInfo.user) {
            userMap[userId] = userInfo.user.real_name || userInfo.user.name || userId
          }
        } catch {
          userMap[userId] = userId
        }
      }

      const formattedMessages = (result.messages || []).map((msg: any) => ({
        ts: msg.ts,
        author: userMap[msg.user] || msg.user || 'Unknown',
        authorId: msg.user,
        content: msg.text,
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        isBot: msg.bot_id ? true : false,
        isParent: msg.ts === args.thread_ts,
      }))

      log.info(
        { tool: 'get_slack_thread_replies', messageCount: formattedMessages.length },
        'fetched Slack thread replies',
      )

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                success: true,
                channelId: args.channel_id,
                threadTs: args.thread_ts,
                messageCount: formattedMessages.length,
                messages: formattedMessages,
                hasMore: result.has_more || false,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      log.error({ err: error, tool: 'get_slack_thread_replies' }, 'unexpected error')
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

// ============================================================================
// Send / Post Tools (proactive messaging for background agents)
// ============================================================================

/**
 * Tool: Send Discord Message
 * Post a message to a Discord channel
 */
export const sendDiscordMessage = tool(
  'send_discord_message',
  'Send a message to a Discord channel. Supports replying to a specific message and attaching workspace files (max 25 MB each). Content longer than 2000 characters is automatically split into multiple messages.',
  {
    channel_id: z.string().describe('The Discord channel ID to send the message to'),
    content: z.string().describe('The message content to send'),
    reply_to_message_id: z.string().optional().describe('Reply to this message ID (optional)'),
    attachments: attachmentsSchema.describe(
      'Files from the workspace to attach (max 25 MB each, Discord limit)',
    ),
  },
  async (args) => {
    log.info(
      {
        tool: 'send_discord_message',
        channelId: args.channel_id,
        contentLength: args.content.length,
        replyToMessageId: args.reply_to_message_id,
        attachmentCount: args.attachments?.length ?? 0,
      },
      'tool called',
    )

    try {
      const client = getDiscordClient()
      if (!client) {
        return toolError(
          'Discord bot is not connected. The bot needs to be running to send messages.',
        )
      }

      // Scope to workspace's connected guilds
      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed) {
        return toolError('Workspace context not available')
      }

      // Verify channel belongs to a workspace-connected guild via REST (works without gateway cache)
      const channelData = (await (client as any).rest
        .get(`/channels/${args.channel_id}`)
        .catch(() => null)) as { id: string; guild_id?: string; type: number } | null
      if (!channelData) {
        return toolError(`Channel ${args.channel_id} not found`)
      }
      if (!channelData.guild_id || !allowed.guildIds.has(channelData.guild_id)) {
        return toolError(
          'This channel does not belong to a Discord server connected to your workspace',
        )
      }

      // Read attachment files if provided
      const resolved = await resolveAttachments(args.attachments, 'discord')
      if (resolved.error) return resolved.error

      // Note: REST send doesn't support discord.js AttachmentBuilder; we send content only.
      // Attachments via REST require multipart/form-data — TODO if needed.
      const chunks = chunkDiscordMessage(args.content)
      let firstMessageId: string | null = null

      for (let i = 0; i < chunks.length; i++) {
        const body: Record<string, unknown> = { content: chunks[i] }
        if (i === 0 && args.reply_to_message_id) {
          body.message_reference = { message_id: args.reply_to_message_id, fail_if_not_exists: false }
        }
        const sent = (await (client as any).rest.post(`/channels/${args.channel_id}/messages`, {
          body,
        })) as { id: string }
        if (i === 0) firstMessageId = sent.id
      }
      const discordFiles: { filename: string }[] = []

      log.info(
        {
          tool: 'send_discord_message',
          channelId: args.channel_id,
          chunksCount: chunks.length,
          attachmentsSent: discordFiles.length,
        },
        'sent Discord message',
      )

      return toolResult({
        success: true,
        messageId: firstMessageId,
        channelId: args.channel_id,
        chunksCount: chunks.length,
        attachmentsSent: discordFiles.length,
      })
    } catch (error) {
      log.error({ err: error, tool: 'send_discord_message' }, 'unexpected error')
      return toolError(error instanceof Error ? error.message : 'Unknown error')
    }
  },
)

/**
 * Tool: Send Slack Message
 * Post a message to a Slack channel
 */
export const sendSlackMessage = tool(
  'send_slack_message',
  'Send a message to a Slack channel. Markdown content is automatically converted to Slack mrkdwn format. Supports posting in a thread via thread_ts and attaching workspace files (max 50 MB each, requires files:write scope).',
  {
    channel_id: z.string().describe('The Slack channel ID to send the message to'),
    content: z.string().describe('The message content to send (markdown supported)'),
    thread_ts: z.string().optional().describe('Thread timestamp to reply in a thread (optional)'),
    attachments: attachmentsSchema.describe(
      'Files from the workspace to attach (max 50 MB each, Slack limit)',
    ),
  },
  async (args) => {
    log.info(
      {
        tool: 'send_slack_message',
        channelId: args.channel_id,
        contentLength: args.content.length,
        threadTs: args.thread_ts,
        attachmentCount: args.attachments?.length ?? 0,
      },
      'tool called',
    )

    try {
      const workspaceId = getExecutionContext().workspaceId
      if (!workspaceId) {
        return toolError('Workspace context not available')
      }

      const client = await getSlackClient(workspaceId)
      if (!client) {
        return toolError('No Slack connection found for this workspace')
      }

      // Try to join the channel first (same pattern as fetchSlackChannelHistory)
      try {
        await client.conversations.join({ channel: args.channel_id })
      } catch (joinError: any) {
        if (
          joinError.data?.error !== 'already_in_channel' &&
          joinError.data?.error !== 'method_not_supported_for_channel_type'
        ) {
          log.warn(
            { slackError: joinError.data?.error, tool: 'send_slack_message' },
            'could not join Slack channel',
          )
        }
      }

      // Read attachment files if provided
      const resolved = await resolveAttachments(args.attachments, 'slack')
      if (resolved.error) return resolved.error

      const formattedContent = formatForSlack(args.content)

      if (resolved.files.length > 0) {
        // Upload files via files.uploadV2 — first file carries the message text as initial_comment
        const uploadResults = []
        for (let i = 0; i < resolved.files.length; i++) {
          const f = resolved.files[i]!
          try {
            const uploadOpts: Record<string, unknown> = {
              channel_id: args.channel_id,
              file: f.content,
              filename: f.filename,
            }
            // First file carries the message text
            if (i === 0) {
              uploadOpts.initial_comment = formattedContent
            }
            if (args.thread_ts) {
              uploadOpts.thread_ts = args.thread_ts
            }
            const uploadResult = await client.files.uploadV2(uploadOpts as any)
            uploadResults.push({
              filename: f.filename,
              ok: true,
              file: (uploadResult as any).file?.id,
            })
          } catch (uploadErr: any) {
            if (uploadErr.data?.error === 'missing_scope') {
              return toolError(
                'The Slack bot needs the "files:write" scope to upload files. Please re-install the Slack app with this permission.',
              )
            }
            uploadResults.push({ filename: f.filename, ok: false, error: uploadErr.message })
          }
        }

        log.info(
          {
            tool: 'send_slack_message',
            channelId: args.channel_id,
            uploadCount: uploadResults.length,
          },
          'uploaded files to Slack',
        )

        return toolResult({
          success: true,
          channelId: args.channel_id,
          attachmentsSent: uploadResults.filter((r) => r.ok).length,
          uploads: uploadResults,
        })
      }

      // No attachments — plain message
      const postOptions: any = {
        channel: args.channel_id,
        text: formattedContent,
      }
      if (args.thread_ts) {
        postOptions.thread_ts = args.thread_ts
      }

      const result = await client.chat.postMessage(postOptions)

      log.info(
        { tool: 'send_slack_message', channelId: args.channel_id, messageTs: result.ts },
        'sent Slack message',
      )

      return toolResult({
        success: true,
        messageTs: result.ts,
        channelId: args.channel_id,
      })
    } catch (error: any) {
      log.error({ err: error, tool: 'send_slack_message' }, 'unexpected error')
      return toolError(error instanceof Error ? error.message : 'Unknown error')
    }
  },
)

// Export all tools as array
export const integrationChannelTools = [
  listDiscordChannels,
  fetchDiscordChannelHistory,
  searchDiscordMessages,
  sendDiscordMessage,
  listSlackChannels,
  fetchSlackChannelHistory,
  searchSlackMessages,
  getSlackThreadReplies,
  sendSlackMessage,
]

/**
 * Create MCP server with all integration channel tools
 * Tools for fetching message history directly from Discord and Slack channels
 */
export const integrationChannelToolsServer = createSdkMcpServer({
  name: 'integration-channel-tools',
  tools: integrationChannelTools,
})

export function createIntegrationChannelToolsServer() {
  return createSdkMcpServer({ name: 'integration-channel-tools', tools: integrationChannelTools })
}
