/**
 * Discord Permission Checker
 *
 * Two-layer permission system for Discord management tools:
 * Layer 1: Is the capability enabled in the workspace's Discord connection settings?
 * Layer 2: Does the triggering Discord user have the required role?
 */

import { getExecutionContext } from '@domains/execution/service/execution-context'
import { discordService } from '@domains/discord/service/discord.service'
import type { DiscordManagementCapability } from '../domains/discord/types/discord.types'
import { getDiscordClient } from './discord-tool-helpers'
import { PermissionsBitField } from 'discord.js'
import { createLogger } from '@utils/logger'

const log = createLogger('discord-permission-checker')

export type { DiscordManagementCapability } from '../domains/discord/types/discord.types'

/** Discord permissions required by the bot for each capability */
const REQUIRED_BOT_PERMISSIONS: Record<DiscordManagementCapability, bigint[]> = {
  channel_create: [PermissionsBitField.Flags.ManageChannels],
  channel_delete: [PermissionsBitField.Flags.ManageChannels],
  channel_modify: [PermissionsBitField.Flags.ManageChannels],
  role_create: [PermissionsBitField.Flags.ManageRoles],
  role_delete: [PermissionsBitField.Flags.ManageRoles],
  role_modify: [PermissionsBitField.Flags.ManageRoles],
  role_assign: [PermissionsBitField.Flags.ManageRoles],
}

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * Check if a Discord management capability is allowed for the current execution.
 *
 * Checks:
 * 1. Capability is enabled in the connection settings (Layer 1)
 * 2. Triggering user has the required Discord role (Layer 2)
 * 3. Bot has the necessary Discord permission (e.g., MANAGE_CHANNELS)
 * 4. For role operations, bot role hierarchy is respected
 */
export async function checkDiscordManagementCapability(
  capability: DiscordManagementCapability,
  guildId: string,
): Promise<PermissionCheckResult> {
  const ctx = getExecutionContext()

  // Get the Discord connection for this workspace + guild
  const connections = await discordService.getConnectionsByWorkspace(ctx.workspaceId)
  const connection = connections.find((c) => c.guildId === guildId && c.enabled)

  if (!connection) {
    log.error(
      {
        guildId,
        workspaceId: ctx.workspaceId,
        availableGuilds: connections.map((c) => ({ guildId: c.guildId, guildName: c.guildName })),
      },
      'no Discord connection for guild in workspace',
    )
    return {
      allowed: false,
      reason: `No active Discord connection found for this guild in the current workspace. Available guild IDs: ${connections.map((c) => c.guildId).join(', ')}`,
    }
  }

  // Layer 1: Check if capability is enabled
  const capConfig = connection.settings.managementCapabilities?.[capability]
  if (!capConfig?.enabled) {
    return {
      allowed: false,
      reason: `The '${capability}' capability is not enabled for this Discord connection. Ask a workspace admin to enable it in Discord settings.`,
    }
  }

  // Layer 2: Check role restrictions
  if (capConfig.allowedBy === 'roles' && capConfig.roleIds?.length) {
    const platformMeta = ctx.platformMetadata

    if (ctx.platformSource !== 'discord' || !platformMeta?.userId) {
      return {
        allowed: false,
        reason: `The '${capability}' capability requires a Discord user with specific roles. This execution was not triggered from Discord.`,
      }
    }

    const client = getDiscordClient()
    if (!client) {
      return { allowed: false, reason: 'Discord bot is not connected' }
    }

    try {
      const guild = client.guilds.cache.get(guildId)
      if (!guild) {
        return { allowed: false, reason: `Guild ${guildId} not found in bot cache` }
      }

      const member = await guild.members.fetch(platformMeta.userId)
      if (!member) {
        return {
          allowed: false,
          reason: 'Could not find the triggering user in this Discord server',
        }
      }

      const hasRole = member.roles.cache.some((role: any) => capConfig.roleIds!.includes(role.id))
      if (!hasRole) {
        return {
          allowed: false,
          reason: `You don't have the required Discord role to use '${capability}'`,
        }
      }
    } catch (error) {
      return {
        allowed: false,
        reason: `Failed to verify Discord roles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  // Check bot permissions in the guild
  const client = getDiscordClient()
  if (client) {
    const guild = client.guilds.cache.get(guildId)
    if (guild) {
      const botMember = guild.members.me
      if (botMember) {
        const requiredPerms = REQUIRED_BOT_PERMISSIONS[capability]
        for (const perm of requiredPerms) {
          if (!botMember.permissions.has(perm)) {
            const permName = new PermissionsBitField(perm).toArray()[0]
            return {
              allowed: false,
              reason: `The Lazarus bot lacks the '${permName}' permission in this Discord server. Please re-authorize the bot with updated permissions.`,
            }
          }
        }
      }
    }
  }

  return { allowed: true }
}

/**
 * Check if the bot can manage a specific role (role hierarchy check).
 * Discord requires the bot's highest role to be above the target role.
 */
export function checkBotRoleHierarchy(guildId: string, roleId: string): PermissionCheckResult {
  const client = getDiscordClient()
  if (!client) return { allowed: false, reason: 'Discord bot is not connected' }

  const guild = client.guilds.cache.get(guildId)
  if (!guild) return { allowed: false, reason: `Guild ${guildId} not found` }

  const botMember = guild.members.me
  if (!botMember) return { allowed: false, reason: 'Bot member not found in guild' }

  const targetRole = guild.roles.cache.get(roleId)
  if (!targetRole) return { allowed: false, reason: `Role ${roleId} not found in this server` }

  if (targetRole.position >= botMember.roles.highest.position) {
    return {
      allowed: false,
      reason: `Cannot manage role '${targetRole.name}' — it is at or above the bot's highest role. Move the Lazarus bot role higher in the server settings.`,
    }
  }

  return { allowed: true }
}
