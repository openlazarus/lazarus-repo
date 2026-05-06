import { Request, Response } from 'express'
import { discordService } from '@domains/discord/service/discord.service'
import type {
  DiscordConnectionSettings,
  DiscordManagementCapability,
} from '@domains/discord/types/discord.types'
import { getDiscordClient } from '@tools/discord-tool-helpers'
import { buildDiscordPermissionsInteger } from '@domains/discord/service/discord-permissions-builder'
import { NotFoundError, BadRequestError, ServiceUnavailableError } from '@errors/api-errors'

const VALID_CAPABILITIES: DiscordManagementCapability[] = [
  'channel_create',
  'channel_delete',
  'channel_modify',
  'role_create',
  'role_delete',
  'role_modify',
  'role_assign',
]

class DiscordSettingsController {
  async getSettings(req: Request, res: Response) {
    const connectionId = req.params.connectionId!
    const connection = await discordService.getConnection(connectionId)

    if (!connection) throw new NotFoundError('Discord connection', connectionId)

    const settingsData = {
      respondToMentions: connection.settings.respondToMentions ?? true,
      respondToDMs: connection.settings.respondToDMs ?? true,
      useThreads: connection.settings.useThreads ?? true,
      channelWhitelist: connection.settings.channelWhitelist ?? [],
      channelBlacklist: connection.settings.channelBlacklist ?? [],
      interactionAccess: connection.settings.interactionAccess ?? { allowedBy: 'everyone' },
      managementCapabilities: connection.settings.managementCapabilities ?? {},
    }

    res.json({
      connectionId: connection.id,
      guildId: connection.guildId,
      guildName: connection.guildName,
      enabled: connection.enabled,
      settings: settingsData,
      requiredPermissions: buildDiscordPermissionsInteger(
        settingsData as DiscordConnectionSettings,
      ),
      requiredPermissionsWithAdmin: buildDiscordPermissionsInteger(
        settingsData as DiscordConnectionSettings,
        { requestAdmin: true },
      ),
    })
  }

  async updateSettings(req: Request, res: Response) {
    const connectionId = req.params.connectionId!
    const connection = await discordService.getConnection(connectionId)

    if (!connection) throw new NotFoundError('Discord connection', connectionId)

    const { interactionAccess, managementCapabilities, ...otherSettings } = req.body

    if (interactionAccess && !['everyone', 'roles'].includes(interactionAccess.allowedBy)) {
      throw new BadRequestError('interactionAccess.allowedBy must be "everyone" or "roles"')
    }

    if (managementCapabilities) {
      for (const [key, config] of Object.entries(managementCapabilities)) {
        if (!VALID_CAPABILITIES.includes(key as DiscordManagementCapability)) {
          throw new BadRequestError(`Invalid capability: ${key}`)
        }
        const capConfig = config as any
        if (capConfig.allowedBy && !['everyone', 'roles'].includes(capConfig.allowedBy)) {
          throw new BadRequestError(`${key}.allowedBy must be "everyone" or "roles"`)
        }
      }
    }

    const updatedSettings: DiscordConnectionSettings = {
      ...connection.settings,
      ...otherSettings,
    }
    if (interactionAccess) updatedSettings.interactionAccess = interactionAccess
    if (managementCapabilities) updatedSettings.managementCapabilities = managementCapabilities

    await discordService.updateConnection(connectionId, { settings: updatedSettings })

    res.json({
      success: true,
      settings: updatedSettings,
      requiredPermissions: buildDiscordPermissionsInteger(updatedSettings),
      requiredPermissionsWithAdmin: buildDiscordPermissionsInteger(updatedSettings, {
        requestAdmin: true,
      }),
    })
  }

  async getGuildRoles(req: Request, res: Response) {
    const connectionId = req.params.connectionId!
    const connection = await discordService.getConnection(connectionId)

    if (!connection) throw new NotFoundError('Discord connection', connectionId)

    const client = getDiscordClient()
    if (!client) throw new ServiceUnavailableError('Discord bot is not connected')

    const guild = client.guilds.cache.get(connection.guildId)
    if (!guild) throw new NotFoundError('Guild', connection.guildId)

    const roles = guild.roles.cache
      .filter((role: any) => role.id !== guild.id && !role.managed)
      .sort((a: any, b: any) => b.position - a.position)
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        memberCount: role.members.size,
      }))

    res.json({
      guildId: guild.id,
      guildName: guild.name,
      roles: Array.from(roles.values()),
    })
  }

  async getGuildChannels(req: Request, res: Response) {
    const connectionId = req.params.connectionId!
    const connection = await discordService.getConnection(connectionId)

    if (!connection) throw new NotFoundError('Discord connection', connectionId)

    const client = getDiscordClient()
    if (!client) throw new ServiceUnavailableError('Discord bot is not connected')

    const guild = client.guilds.cache.get(connection.guildId)
    if (!guild) throw new NotFoundError('Guild', connection.guildId)

    const channels = guild.channels.cache
      .filter((ch: any) => ch.type === 0 || ch.type === 5)
      .sort((a: any, b: any) => a.position - b.position)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        parentName: ch.parent?.name || null,
      }))

    res.json({
      guildId: guild.id,
      guildName: guild.name,
      channels: Array.from(channels.values()),
    })
  }
}

export const discordSettingsController = new DiscordSettingsController()
