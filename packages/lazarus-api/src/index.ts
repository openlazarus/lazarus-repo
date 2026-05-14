#!/usr/bin/env node
// Load .env + .env.local before any other imports
import './load-env'

// Initialize Sentry BEFORE importing other modules
import * as Sentry from '@sentry/node'
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  enabled: !!process.env.SENTRY_DSN,
})

import logger from './utils/logger'

// Initialize OpenTelemetry after Sentry, before modules that emit spans
import { initOtel } from './observability/otel'
initOtel()

// Now import other modules that depend on env vars
import { startServer } from './app'
import { backgroundProcessManager } from './background/manager'
import { getDiscordBot } from './domains/discord/service/discord-bot'
import { memoryPressureMonitor } from './domains/chat/service/memory-pressure-monitor'

// Main entry point
async function main() {
  logger.info('Starting Lazarus TypeScript Implementation...')
  logger.info({ port: process.env.API_PORT || 8000 }, 'API Server will run on port')

  try {
    // Start Express server
    await startServer()

    // Start memory pressure monitor
    memoryPressureMonitor.start()

    // Initialize and start background processes (non-fatal if it fails)
    try {
      await backgroundProcessManager.initialize()
      await backgroundProcessManager.start()
      logger.info('Background processes started successfully!')
    } catch (bgError) {
      logger.warn(
        { err: bgError },
        '[BackgroundProcessManager] Failed to start background processes (non-fatal)',
      )
      logger.warn(
        '[BackgroundProcessManager] Server will continue running without background processes.',
      )
      logger.warn(
        '[BackgroundProcessManager] Check your SUPABASE_SERVICE_ROLE_KEY environment variable.',
      )
    }

    // Initialize Discord bot (non-fatal if it fails)
    try {
      const discordListenerEnabled = process.env.DISCORD_LISTENER_ENABLED === 'true'
      const discordBot = getDiscordBot()
      if (!discordListenerEnabled) {
        if (discordBot.isConfigured()) {
          await discordBot.startRestOnly()
        } else {
          logger.info('Discord bot not configured (DISCORD_BOT_TOKEN not set), skipping REST-only init...')
        }
      } else if (discordBot.isConfigured()) {
        await discordBot.start()
        logger.info('Discord bot started successfully!')
      } else {
        logger.info('Discord bot not configured (DISCORD_BOT_TOKEN not set), skipping...')
      }
    } catch (discordError) {
      logger.warn({ err: discordError }, '[DiscordBot] Failed to start Discord bot (non-fatal)')
      logger.warn('[DiscordBot] Server will continue running without Discord integration.')
    }

    logger.info('Lazarus started successfully!')
  } catch (error) {
    logger.error({ err: error }, 'Failed to start Lazarus')
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down Lazarus...')

  // Stop Discord bot
  try {
    const discordBot = getDiscordBot()
    await discordBot.stop()
  } catch (error) {
    logger.error({ err: error }, 'Error stopping Discord bot')
  }

  // Stop background processes
  try {
    await backgroundProcessManager.stop()
  } catch (error) {
    logger.error({ err: error }, 'Error stopping background processes')
  }

  logger.info('Lazarus stopped.')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Shutting down Lazarus...')

  // Stop Discord bot
  try {
    const discordBot = getDiscordBot()
    await discordBot.stop()
  } catch (error) {
    logger.error({ err: error }, 'Error stopping Discord bot')
  }

  // Stop background processes
  try {
    await backgroundProcessManager.stop()
  } catch (error) {
    logger.error({ err: error }, 'Error stopping background processes')
  }

  logger.info('Lazarus stopped.')
  process.exit(0)
})

// Start the application
main().catch((error) => {
  logger.error({ err: error }, 'Unhandled error')
  process.exit(1)
})
