/**
 * Integration Services Module
 *
 * Exports all integration-related services for Discord and Slack.
 */

// Core services
export { ConversationDetector, conversationDetector } from './conversation-detector'
export { AttachmentProcessor, attachmentProcessor } from './attachment-processor'
export type {
  ConversationContext,
  IntegrationPlatform,
  ProcessedAttachment,
  DiscordAttachment,
  SlackFile,
} from '@domains/integration/types/integration.types'

// Platform-specific services
export { DiscordService, discordService } from '@domains/discord/service/discord.service'
export type {
  DiscordConnection,
  DiscordMessage,
  DiscordConnectionSettings,
} from '../../discord/types/discord.types'
export { SlackService, slackService } from '@domains/slack/service/slack.service'
export type {
  SlackConnection,
  SlackMessage,
  SlackConnectionSettings,
} from '../../slack/types/slack.types'

// Discord bot
export {
  DiscordBot,
  getDiscordBot,
  initializeDiscordBot,
} from '@domains/discord/service/discord-bot'

// Integration manager
export { IntegrationManager, integrationManager } from './integration-manager'
export type {
  Integration,
  IntegrationType,
  IntegrationStats,
} from '@domains/integration/types/integration.types'
