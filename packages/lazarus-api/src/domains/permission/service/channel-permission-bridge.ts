/**
 * Channel Permission Bridge
 *
 * Defines the interfaces for sending permission requests through communication
 * channels (WhatsApp, Discord, Email, Slack) when background agents need
 * approval for ask_first tools.
 */

import { WhatsAppPermissionProvider } from './providers/whatsapp-permission-provider'
import type {
  ChannelPermissionBundle,
  PermissionChannelConfig,
} from '@domains/permission/types/permission.types'

const PLATFORM_CONFIG_BUNDLE_BUILDERS: Partial<
  Record<
    PermissionChannelConfig['platform'],
    (config: PermissionChannelConfig) => ChannelPermissionBundle | null
  >
> = {
  whatsapp: (config) => {
    if (!config.phoneNumberId || !config.targetPhone) return null
    return {
      provider: new WhatsAppPermissionProvider(),
      context: {
        platform: 'whatsapp',
        phoneNumberId: config.phoneNumberId,
        senderPhone: config.targetPhone,
      },
    }
  },
  // Future: discord, email, slack
}

const PLATFORM_SOURCE_BUNDLE_BUILDERS: Record<
  string,
  (platformMetadata: Record<string, any>) => ChannelPermissionBundle | null
> = {
  whatsapp: (platformMetadata) => {
    const { phoneNumberId, senderPhone } = platformMetadata
    if (!phoneNumberId || !senderPhone) return null
    return {
      provider: new WhatsAppPermissionProvider(),
      context: {
        platform: 'whatsapp',
        phoneNumberId,
        senderPhone,
      },
    }
  },
  // Future: discord, email, slack
}

/**
 * Build a permission provider + context from the agent's configured permissionChannel.
 * Used when agents have a pre-configured channel for permission requests
 * (e.g. scheduled triggers that have no originating channel).
 */
export function buildFromAgentConfig(
  config: PermissionChannelConfig,
): ChannelPermissionBundle | null {
  if (!config.enabled) return null

  const builder = PLATFORM_CONFIG_BUNDLE_BUILDERS[config.platform]
  return builder ? builder(config) : null
}

/**
 * Build a permission provider + context from the originating platform that
 * triggered the agent (e.g. the WhatsApp message that started this execution).
 */
export function buildFromPlatformSource(
  platformSource: string,
  platformMetadata: Record<string, any>,
): ChannelPermissionBundle | null {
  const builder = PLATFORM_SOURCE_BUNDLE_BUILDERS[platformSource]
  return builder ? builder(platformMetadata) : null
}

/**
 * Convenience wrapper: try agent config first, then originating platform.
 */
export function buildChannelPermissionContext(
  agentPermissionChannel: PermissionChannelConfig | undefined,
  platformSource: string | undefined,
  platformMetadata: Record<string, any> | undefined,
): ChannelPermissionBundle | null {
  // Priority 1: Agent's configured permissionChannel
  if (agentPermissionChannel?.enabled) {
    const bundle = buildFromAgentConfig(agentPermissionChannel)
    if (bundle) return bundle
  }

  // Priority 2: Originating channel
  if (platformSource && platformMetadata) {
    return buildFromPlatformSource(platformSource, platformMetadata)
  }

  return null
}
