/**
 * Discord Permissions Integer Builder
 *
 * Dynamically builds the OAuth2 permissions integer based on
 * which management capabilities are enabled in the connection settings.
 */

import type {
  DiscordConnectionSettings,
  DiscordManagementCapability,
} from '@domains/discord/types/discord.types'

/** Discord permission bit flags */
const PermissionBits = {
  Administrator: 1n << 3n,
  ManageChannels: 1n << 4n,
  ManageGuild: 1n << 5n,
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  ReadMessageHistory: 1n << 16n,
  SendMessagesInThreads: 1n << 38n,
  ManageRoles: 1n << 28n,
} as const

/** Which Discord permissions each capability requires */
const CAPABILITY_PERMISSIONS: Record<DiscordManagementCapability, (keyof typeof PermissionBits)[]> =
  {
    channel_create: ['ManageChannels'],
    channel_delete: ['ManageChannels'],
    channel_modify: ['ManageChannels', 'ManageRoles'],
    role_create: ['ManageRoles'],
    role_delete: ['ManageRoles'],
    role_modify: ['ManageRoles'],
    role_assign: ['ManageRoles'],
  }

/** Base permissions always needed by the bot */
const BASE_PERMISSIONS: (keyof typeof PermissionBits)[] = [
  'ViewChannel',
  'SendMessages',
  'ReadMessageHistory',
  'SendMessagesInThreads',
]

/**
 * Build the Discord OAuth2 permissions integer based on enabled capabilities.
 */
export function buildDiscordPermissionsInteger(
  settings: DiscordConnectionSettings,
  options?: { requestAdmin?: boolean },
): string {
  let perms = 0n

  // Always include base permissions
  for (const perm of BASE_PERMISSIONS) {
    perms |= PermissionBits[perm]
  }

  // Add permissions for each enabled capability
  const caps = settings.managementCapabilities
  if (caps) {
    for (const [cap, config] of Object.entries(caps)) {
      if (config?.enabled) {
        const required = CAPABILITY_PERMISSIONS[cap as DiscordManagementCapability]
        if (required) {
          for (const perm of required) {
            perms |= PermissionBits[perm]
          }
        }
      }
    }
  }

  // Add ManageGuild if any management permission is requested
  if (perms & PermissionBits.ManageChannels || perms & PermissionBits.ManageRoles) {
    perms |= PermissionBits.ManageGuild
  }

  // Administrator if requested
  if (options?.requestAdmin) {
    perms |= PermissionBits.Administrator
  }

  return perms.toString()
}
