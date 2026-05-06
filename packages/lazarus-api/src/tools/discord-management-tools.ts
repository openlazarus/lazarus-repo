/**
 * Discord Management Tools for Lazarus Agents
 *
 * MCP tools for managing Discord channels, roles, and members.
 * All tools enforce a two-layer permission system:
 * 1. Capability must be enabled in workspace Discord settings
 * 2. Triggering user must have the required Discord role (if configured)
 */

import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { ChannelType, PermissionsBitField } from 'discord.js'
import {
  toolResult,
  toolError,
  getDiscordClient,
  getAllowedDiscordGuildIds,
} from './discord-tool-helpers'
import {
  checkDiscordManagementCapability,
  checkBotRoleHierarchy,
  DiscordManagementCapability,
} from './discord-permission-checker'

/** Wrapper: SDK tool() typing is stricter than our toolResult/toolError helpers. */
function discordTool<Schema extends z.ZodRawShape>(
  name: string,
  description: string,
  schema: Schema,
  handler: (args: z.infer<z.ZodObject<Schema>>, extra: unknown) => Promise<unknown>,
): any {
  return tool(name, description, schema, handler as any)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate guild belongs to workspace and return the guild object. */
async function resolveGuild(guildId: string) {
  const client = getDiscordClient()
  if (!client) return { error: toolError('Discord bot is not connected') }

  const allowed = await getAllowedDiscordGuildIds()
  if (!allowed) return { error: toolError('Workspace context not available') }
  if (!allowed.guildIds.has(guildId)) {
    return {
      error: toolError(
        `This Discord server is not connected to your workspace. Available guild IDs: ${Array.from(allowed.guildIds).join(', ')}`,
      ),
    }
  }

  const guild = client.guilds.cache.get(guildId)
  if (!guild) return { error: toolError(`Guild ${guildId} not found in bot cache`) }

  return { guild }
}

/** Check permission and return error result if denied. */
async function requireCapability(capability: DiscordManagementCapability, guildId: string) {
  const check = await checkDiscordManagementCapability(capability, guildId)
  if (!check.allowed) return toolError(check.reason || 'Permission denied')
  return null
}

/** Resolve a user by ID or username search in a guild. */
async function resolveGuildMember(guild: any, userId?: string, username?: string) {
  if (userId) {
    try {
      return { member: await guild.members.fetch(userId) }
    } catch {
      return { error: toolError(`User with ID ${userId} not found in this server`) }
    }
  }

  if (username) {
    const results = await guild.members.search({ query: username, limit: 10 })
    if (results.size === 0) {
      return { error: toolError(`No members found matching "${username}"`) }
    }
    if (results.size === 1) {
      return { member: results.first() }
    }
    // Multiple matches — return them for clarification
    const matches = results.map((m: any) => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      roles: m.roles.cache.filter((r: any) => r.id !== guild.id).map((r: any) => r.name),
    }))
    return {
      error: toolResult({
        success: false,
        error: `Multiple members match "${username}". Please specify by user_id.`,
        matches: Array.from(matches.values()),
      }),
    }
  }

  return { error: toolError('Either user_id or username must be provided') }
}

// ---------------------------------------------------------------------------
// Channel Tools
// ---------------------------------------------------------------------------

const listDiscordCategories = discordTool(
  'list_discord_categories',
  'List all category channels in a connected Discord server.',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
  },
  async (args, _extra: unknown) => {
    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const categories = guild.channels.cache
      .filter((ch: any) => ch.type === ChannelType.GuildCategory)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        position: ch.position,
        childChannels: guild.channels.cache
          .filter((child: any) => child.parentId === ch.id)
          .map((child: any) => ({ id: child.id, name: child.name, type: child.type })),
      }))

    return toolResult({
      success: true,
      guildId: guild.id,
      guildName: guild.name,
      categoryCount: categories.length,
      categories: Array.from(categories.values()),
    })
  },
)

const createDiscordChannel = discordTool(
  'create_discord_channel',
  'Create a new channel (text, voice, or category) in a Discord server.',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    name: z.string().describe('Channel name'),
    type: z.enum(['text', 'voice', 'category']).default('text').describe('Channel type'),
    topic: z.string().optional().describe('Channel topic (text channels only)'),
    parent_id: z.string().optional().describe('Category ID to place channel under'),
  },
  async (args, _extra: unknown) => {
    const permError = await requireCapability('channel_create', args.guild_id)
    if (permError) return permError

    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const channelTypeMap: Record<string, ChannelType> = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      category: ChannelType.GuildCategory,
    }

    try {
      const options: any = {
        name: args.name,
        type: channelTypeMap[args.type],
      }
      if (args.topic && args.type === 'text') options.topic = args.topic
      if (args.parent_id && args.type !== 'category') options.parent = args.parent_id

      const channel = await guild.channels.create(options)

      return toolResult({
        success: true,
        channel: {
          id: channel.id,
          name: channel.name,
          type: args.type,
          parentId: (channel as any).parentId || null,
        },
      })
    } catch (error) {
      return toolError(
        `Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const deleteDiscordChannel = discordTool(
  'delete_discord_channel',
  'Delete a channel from a Discord server.',
  {
    channel_id: z.string().describe('Channel ID to delete'),
    reason: z.string().optional().describe('Reason for deletion (shown in audit log)'),
  },
  async (args, _extra: unknown) => {
    const client = getDiscordClient()
    if (!client) return toolError('Discord bot is not connected')

    try {
      const channel = await client.channels.fetch(args.channel_id)
      if (!channel) return toolError(`Channel ${args.channel_id} not found`)

      const guildId = (channel as any).guild?.id
      if (!guildId) return toolError('Channel is not in a guild')

      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed?.guildIds.has(guildId)) {
        return toolError('This channel is not in a Discord server connected to your workspace')
      }

      const permError = await requireCapability('channel_delete', guildId)
      if (permError) return permError

      const channelName = (channel as any).name
      await channel.delete(args.reason)

      return toolResult({ success: true, deletedChannel: channelName, channelId: args.channel_id })
    } catch (error) {
      return toolError(
        `Failed to delete channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const updateDiscordChannel = discordTool(
  'update_discord_channel',
  'Update a Discord channel (rename, change topic, move to category).',
  {
    channel_id: z.string().describe('Channel ID to update'),
    name: z.string().optional().describe('New channel name'),
    topic: z.string().optional().describe('New channel topic'),
    parent_id: z
      .string()
      .optional()
      .describe('New category ID to move channel to (use "none" to remove from category)'),
    position: z.number().optional().describe('New position in the channel list'),
  },
  async (args, _extra: unknown) => {
    const client = getDiscordClient()
    if (!client) return toolError('Discord bot is not connected')

    try {
      const channel = await client.channels.fetch(args.channel_id)
      if (!channel) return toolError(`Channel ${args.channel_id} not found`)

      const guildId = (channel as any).guild?.id
      if (!guildId) return toolError('Channel is not in a guild')

      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed?.guildIds.has(guildId)) {
        return toolError('This channel is not in a Discord server connected to your workspace')
      }

      const permError = await requireCapability('channel_modify', guildId)
      if (permError) return permError

      const updates = {
        ...(args.name && { name: args.name }),
        ...(args.topic !== undefined && { topic: args.topic }),
        ...(args.parent_id && { parent: args.parent_id === 'none' ? null : args.parent_id }),
        ...(args.position !== undefined && { position: args.position }),
      }

      const updated = await (channel as any).edit(updates)

      return toolResult({
        success: true,
        channel: {
          id: updated.id,
          name: updated.name,
          topic: updated.topic,
          parentId: updated.parentId,
        },
      })
    } catch (error) {
      return toolError(
        `Failed to update channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const setDiscordChannelPermissions = discordTool(
  'set_discord_channel_permissions',
  'Set permission overrides on a Discord channel for specific roles or users.',
  {
    channel_id: z.string().describe('Channel ID to set permissions on'),
    overwrites: z
      .array(
        z.object({
          id: z.string().describe('Role ID or user ID'),
          type: z.enum(['role', 'member']).describe('Whether the ID is a role or member'),
          allow: z
            .array(z.string())
            .optional()
            .describe('Permission names to allow (e.g., "ViewChannel", "SendMessages")'),
          deny: z.array(z.string()).optional().describe('Permission names to deny'),
        }),
      )
      .describe('Permission overwrites to set'),
  },
  async (args, _extra: unknown) => {
    const client = getDiscordClient()
    if (!client) return toolError('Discord bot is not connected')

    try {
      const channel = await client.channels.fetch(args.channel_id)
      if (!channel) return toolError(`Channel ${args.channel_id} not found`)

      const guildId = (channel as any).guild?.id
      if (!guildId) return toolError('Channel is not in a guild')

      const allowed = await getAllowedDiscordGuildIds()
      if (!allowed?.guildIds.has(guildId)) {
        return toolError('This channel is not in a Discord server connected to your workspace')
      }

      const permError = await requireCapability('channel_modify', guildId)
      if (permError) return permError

      const applied: any[] = []
      for (const ow of args.overwrites) {
        await (channel as any).permissionOverwrites.edit(ow.id, {
          ...Object.fromEntries((ow.allow || []).map((p) => [p, true])),
          ...Object.fromEntries((ow.deny || []).map((p) => [p, false])),
        })

        applied.push({ id: ow.id, type: ow.type, allow: ow.allow, deny: ow.deny })
      }

      return toolResult({ success: true, channelId: args.channel_id, appliedOverwrites: applied })
    } catch (error) {
      return toolError(
        `Failed to set permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

// ---------------------------------------------------------------------------
// Role Tools
// ---------------------------------------------------------------------------

const listDiscordRoles = discordTool(
  'list_discord_roles',
  'List all roles in a connected Discord server.',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
  },
  async (args, _extra: unknown) => {
    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const roles = guild.roles.cache
      .sort((a: any, b: any) => b.position - a.position)
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        memberCount: role.members.size,
        mentionable: role.mentionable,
        managed: role.managed,
        isEveryone: role.id === guild.id,
      }))

    return toolResult({
      success: true,
      guildId: guild.id,
      guildName: guild.name,
      roleCount: roles.length,
      roles: Array.from(roles.values()),
    })
  },
)

const listDiscordMembers = discordTool(
  'list_discord_members',
  'List members in a connected Discord server, optionally filtered by role.',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    role_id: z.string().optional().describe('Filter by role ID (only show members with this role)'),
    limit: z.number().default(100).describe('Maximum members to return (max 1000)'),
  },
  async (args, _extra: unknown) => {
    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    try {
      const fetchLimit = Math.min(args.limit, 1000)
      const members = await guild.members.fetch({ limit: fetchLimit })

      let filtered = members
      if (args.role_id) {
        filtered = members.filter((m: any) => m.roles.cache.has(args.role_id!))
      }

      const memberList = filtered.map((m: any) => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        isBot: m.user.bot,
        roles: m.roles.cache
          .filter((r: any) => r.id !== guild.id)
          .map((r: any) => ({ id: r.id, name: r.name })),
        joinedAt: m.joinedAt?.toISOString(),
      }))

      return toolResult({
        success: true,
        guildId: guild.id,
        guildName: guild.name,
        memberCount: memberList.length,
        members: Array.from(memberList.values()),
      })
    } catch (error) {
      return toolError(
        `Failed to list members: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const createDiscordRole = discordTool(
  'create_discord_role',
  'Create a new role in a Discord server.',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    name: z.string().describe('Role name'),
    color: z.string().optional().describe('Role color as hex (e.g., "#FF5733")'),
    mentionable: z.boolean().optional().describe('Whether the role can be mentioned'),
    hoist: z
      .boolean()
      .optional()
      .describe('Whether to display role members separately in the sidebar'),
    permissions: z
      .array(z.string())
      .optional()
      .describe('Permission names to grant (e.g., "ViewChannel", "SendMessages")'),
  },
  async (args, _extra: unknown) => {
    const permError = await requireCapability('role_create', args.guild_id)
    if (permError) return permError

    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    try {
      const options: any = {
        name: args.name,
        ...(args.color && { color: args.color }),
        ...(args.mentionable !== undefined && { mentionable: args.mentionable }),
        ...(args.hoist !== undefined && { hoist: args.hoist }),
      }
      if (args.permissions?.length) {
        const bits = args.permissions.reduce((acc, p) => {
          const flag = (PermissionsBitField.Flags as any)[p]
          return flag ? acc | flag : acc
        }, 0n)
        options.permissions = bits
      }

      const role = await guild.roles.create(options)

      return toolResult({
        success: true,
        role: {
          id: role.id,
          name: role.name,
          color: role.hexColor,
          position: role.position,
        },
      })
    } catch (error) {
      return toolError(
        `Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const deleteDiscordRole = discordTool(
  'delete_discord_role',
  'Delete a role from a Discord server.',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    role_id: z.string().describe('Role ID to delete'),
    reason: z.string().optional().describe('Reason for deletion (shown in audit log)'),
  },
  async (args, _extra: unknown) => {
    const permError = await requireCapability('role_delete', args.guild_id)
    if (permError) return permError

    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const hierarchyCheck = checkBotRoleHierarchy(args.guild_id, args.role_id)
    if (!hierarchyCheck.allowed) return toolError(hierarchyCheck.reason!)

    try {
      const role = guild.roles.cache.get(args.role_id)
      if (!role) return toolError(`Role ${args.role_id} not found`)

      const roleName = role.name
      await role.delete(args.reason)

      return toolResult({ success: true, deletedRole: roleName, roleId: args.role_id })
    } catch (error) {
      return toolError(
        `Failed to delete role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const updateDiscordRole = discordTool(
  'update_discord_role',
  'Update a Discord role (rename, change color, change permissions).',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    role_id: z.string().describe('Role ID to update'),
    name: z.string().optional().describe('New role name'),
    color: z.string().optional().describe('New color as hex (e.g., "#FF5733")'),
    mentionable: z.boolean().optional().describe('Whether the role can be mentioned'),
    hoist: z.boolean().optional().describe('Whether to display separately in sidebar'),
    permissions: z.array(z.string()).optional().describe('Permission names to set'),
  },
  async (args, _extra: unknown) => {
    const permError = await requireCapability('role_modify', args.guild_id)
    if (permError) return permError

    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const hierarchyCheck = checkBotRoleHierarchy(args.guild_id, args.role_id)
    if (!hierarchyCheck.allowed) return toolError(hierarchyCheck.reason!)

    try {
      const role = guild.roles.cache.get(args.role_id)
      if (!role) return toolError(`Role ${args.role_id} not found`)

      const updates: any = {
        ...(args.name && { name: args.name }),
        ...(args.color && { color: args.color }),
        ...(args.mentionable !== undefined && { mentionable: args.mentionable }),
        ...(args.hoist !== undefined && { hoist: args.hoist }),
      }
      if (args.permissions?.length) {
        updates.permissions = args.permissions.reduce((acc, p) => {
          const flag = (PermissionsBitField.Flags as any)[p]
          return flag ? acc | flag : acc
        }, 0n)
      }

      const updated = await role.edit(updates)

      return toolResult({
        success: true,
        role: {
          id: updated.id,
          name: updated.name,
          color: updated.hexColor,
          position: updated.position,
        },
      })
    } catch (error) {
      return toolError(
        `Failed to update role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const assignDiscordRole = discordTool(
  'assign_discord_role',
  'Assign a role to a Discord server member. Identify the user by user_id (from mentions) or username (text search).',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    role_id: z.string().describe('Role ID to assign'),
    user_id: z.string().optional().describe('Discord user ID (from mentions/tags)'),
    username: z.string().optional().describe('Username or display name to search for'),
  },
  async (args, _extra: unknown) => {
    const permError = await requireCapability('role_assign', args.guild_id)
    if (permError) return permError

    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const hierarchyCheck = checkBotRoleHierarchy(args.guild_id, args.role_id)
    if (!hierarchyCheck.allowed) return toolError(hierarchyCheck.reason!)

    const role = guild.roles.cache.get(args.role_id)
    if (!role) return toolError(`Role ${args.role_id} not found`)

    const memberResult = await resolveGuildMember(guild, args.user_id, args.username)
    if ('error' in memberResult) return memberResult.error
    const { member } = memberResult

    try {
      await member.roles.add(role)
      return toolResult({
        success: true,
        user: { id: member.id, username: member.user.username, displayName: member.displayName },
        role: { id: role.id, name: role.name },
        action: 'assigned',
      })
    } catch (error) {
      return toolError(
        `Failed to assign role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

const removeDiscordRole = discordTool(
  'remove_discord_role',
  'Remove a role from a Discord server member. Identify the user by user_id (from mentions) or username (text search).',
  {
    guild_id: z.string().describe('Discord server/guild ID'),
    role_id: z.string().describe('Role ID to remove'),
    user_id: z.string().optional().describe('Discord user ID (from mentions/tags)'),
    username: z.string().optional().describe('Username or display name to search for'),
  },
  async (args, _extra: unknown) => {
    const permError = await requireCapability('role_assign', args.guild_id)
    if (permError) return permError

    const resolved = await resolveGuild(args.guild_id)
    if ('error' in resolved) return resolved.error
    const { guild } = resolved

    const hierarchyCheck = checkBotRoleHierarchy(args.guild_id, args.role_id)
    if (!hierarchyCheck.allowed) return toolError(hierarchyCheck.reason!)

    const role = guild.roles.cache.get(args.role_id)
    if (!role) return toolError(`Role ${args.role_id} not found`)

    const memberResult = await resolveGuildMember(guild, args.user_id, args.username)
    if ('error' in memberResult) return memberResult.error
    const { member } = memberResult

    try {
      await member.roles.remove(role)
      return toolResult({
        success: true,
        user: { id: member.id, username: member.user.username, displayName: member.displayName },
        role: { id: role.id, name: role.name },
        action: 'removed',
      })
    } catch (error) {
      return toolError(
        `Failed to remove role: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
)

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

export function createDiscordManagementToolsServer() {
  return createSdkMcpServer({
    name: 'discord-management-tools',
    version: '1.0.0',
    tools: [
      // Channel tools
      listDiscordCategories,
      createDiscordChannel,
      deleteDiscordChannel,
      updateDiscordChannel,
      setDiscordChannelPermissions,
      // Role tools
      listDiscordRoles,
      listDiscordMembers,
      createDiscordRole,
      deleteDiscordRole,
      updateDiscordRole,
      assignDiscordRole,
      removeDiscordRole,
    ],
  })
}
