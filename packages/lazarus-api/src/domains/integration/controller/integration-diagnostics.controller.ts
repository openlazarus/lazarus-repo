import { Request, Response } from 'express'
import * as fs from 'fs/promises'
import * as path from 'path'
import { STORAGE_BASE_PATH } from '@infrastructure/config/storage'
import { integrationDiagnosticsRepository } from '@domains/integration/repository/integration-diagnostics.repository'
import { InternalServerError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'

const log = createLogger('integration-diagnostics')

function maskString(str: string | undefined, showChars: number = 4): string {
  if (!str) return 'not configured'
  if (str.length <= showChars) return '****'
  return str.substring(0, showChars) + '****'
}

class IntegrationDiagnosticsController {
  async getConfig(_req: Request, res: Response) {
    try {
      const config = {
        discord: {
          clientId: maskString(process.env.DISCORD_CLIENT_ID),
          clientIdPublic: maskString(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID),
          clientSecret: process.env.DISCORD_CLIENT_SECRET ? 'configured' : 'not configured',
          botToken: process.env.DISCORD_BOT_TOKEN ? 'configured' : 'not configured',
          configured: !!(
            process.env.DISCORD_CLIENT_ID &&
            process.env.DISCORD_CLIENT_SECRET &&
            process.env.DISCORD_BOT_TOKEN
          ),
        },
        slack: {
          clientId: maskString(process.env.SLACK_CLIENT_ID),
          clientIdPublic: maskString(process.env.NEXT_PUBLIC_SLACK_CLIENT_ID),
          clientSecret: process.env.SLACK_CLIENT_SECRET ? 'configured' : 'not configured',
          signingSecret: process.env.SLACK_SIGNING_SECRET ? 'configured' : 'not configured',
          configured: !!(
            process.env.SLACK_CLIENT_ID &&
            process.env.SLACK_CLIENT_SECRET &&
            process.env.SLACK_SIGNING_SECRET
          ),
        },
        storage: {
          basePath: STORAGE_BASE_PATH,
          configured: true,
        },
      }

      res.json(config)
    } catch (error: any) {
      log.error({ err: error }, 'Error getting config')
      throw new InternalServerError(error.message)
    }
  }

  async getConnections(req: Request, res: Response) {
    try {
      const workspaceId = req.params.workspaceId!

      const { data: discordConnections, error: discordError } =
        await integrationDiagnosticsRepository.getDiscordConnectionsForWorkspace(workspaceId)

      if (discordError) {
        log.error({ err: discordError }, 'Discord query error')
      }

      const { data: slackConnections, error: slackError } =
        await integrationDiagnosticsRepository.getSlackConnectionsForWorkspace(workspaceId)

      if (slackError) {
        log.error({ err: slackError }, 'Slack query error')
      }

      res.json({
        workspaceId,
        discord: (discordConnections || []).map((c: any) => ({
          id: c.id,
          guildId: c.guild_id,
          guildName: c.guild_name,
          enabled: c.enabled,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
        slack: (slackConnections || []).map((c: any) => ({
          id: c.id,
          teamId: c.slack_team_id,
          teamName: c.slack_team_name,
          enabled: c.enabled,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      })
    } catch (error: any) {
      log.error({ err: error }, 'Error getting connections')
      throw new InternalServerError(error.message)
    }
  }

  async getConversations(req: Request, res: Response) {
    try {
      const workspaceId = req.params.workspaceId!
      const limit = parseInt(req.query.limit as string) || 10

      const { data: discordConns } =
        await integrationDiagnosticsRepository.getDiscordConnectionIds(workspaceId)
      const discordConnIds = (discordConns || []).map((c: any) => c.id)

      const { data: slackConns } =
        await integrationDiagnosticsRepository.getSlackConnectionIds(workspaceId)
      const slackConnIds = (slackConns || []).map((c: any) => c.id)

      let discordConversations: any[] = []
      if (discordConnIds.length > 0) {
        const { data } = await integrationDiagnosticsRepository.getRecentDiscordConversations(
          discordConnIds,
          limit,
        )
        discordConversations = data || []
      }

      let slackConversations: any[] = []
      if (slackConnIds.length > 0) {
        const { data } = await integrationDiagnosticsRepository.getRecentSlackConversations(
          slackConnIds,
          limit,
        )
        slackConversations = data || []
      }

      res.json({
        workspaceId,
        discord: {
          connectionCount: discordConnIds.length,
          conversations: discordConversations.map((c: any) => ({
            id: c.id,
            channelId: c.channel_id,
            messageCount: c.message_count,
            lastMessageAt: c.last_message_at,
            createdAt: c.created_at,
          })),
        },
        slack: {
          connectionCount: slackConnIds.length,
          conversations: slackConversations.map((c: any) => ({
            id: c.id,
            channelId: c.channel_id,
            messageCount: c.message_count,
            lastMessageAt: c.last_message_at,
            createdAt: c.created_at,
          })),
        },
      })
    } catch (error: any) {
      log.error({ err: error }, 'Error getting conversations')
      throw new InternalServerError(error.message)
    }
  }

  async testAttachment(req: Request, res: Response) {
    try {
      const workspaceId = req.params.workspaceId!
      const { platform = 'test' } = req.body

      const { data: workspace } =
        await integrationDiagnosticsRepository.getWorkspaceSettings(workspaceId)

      const settings = workspace?.settings as Record<string, any> | null
      let workspacePath: string
      if (settings?.path) {
        workspacePath = settings.path
      } else {
        workspacePath = path.join(STORAGE_BASE_PATH, 'workspaces', workspaceId)
      }

      const timestamp = Date.now()
      const testContent = `Test attachment created at ${new Date().toISOString()}`
      const testFilename = `test_${timestamp}.txt`
      const attachmentsDir = path.join(workspacePath, 'integrations', platform, 'attachments')
      const fullPath = path.join(attachmentsDir, testFilename)
      const storagePath = `integrations/${platform}/attachments/${testFilename}`

      await fs.mkdir(attachmentsDir, { recursive: true })

      await fs.writeFile(fullPath, testContent)

      const metadata = {
        id: `test-${timestamp}`,
        filename: testFilename,
        contentType: 'text/plain',
        size: testContent.length,
        platform,
        workspaceId,
        createdAt: new Date().toISOString(),
        isTest: true,
      }
      await fs.writeFile(`${fullPath}.meta.json`, JSON.stringify(metadata, null, 2))

      const stats = await fs.stat(fullPath)

      const readUrl = `/api/files/workspace/${workspaceId}/read?path=${encodeURIComponent(storagePath)}`

      res.json({
        success: true,
        path: storagePath,
        fullPath,
        readUrl,
        size: stats.size,
        metadata,
      })
    } catch (error: any) {
      log.error({ err: error }, 'Error testing attachment')
      throw new InternalServerError(error.message)
    }
  }

  async getWebhookEndpoints(req: Request, res: Response) {
    try {
      const baseUrl = process.env.API_BASE_URL || req.headers.origin || 'http://localhost:8000'

      res.json({
        discord: {
          interactionsEndpoint: `${baseUrl}/api/webhooks/discord`,
          description: "Set this as your Discord application's Interactions Endpoint URL",
        },
        slack: {
          eventsEndpoint: `${baseUrl}/api/webhooks/slack/events`,
          commandsEndpoint: `${baseUrl}/api/webhooks/slack/commands`,
          description:
            "Set these as your Slack app's Event Subscriptions and Slash Commands Request URLs",
        },
      })
    } catch (error: any) {
      log.error({ err: error }, 'Error getting webhook endpoints')
      throw new InternalServerError(error.message)
    }
  }

  async getOAuthUrls(req: Request, res: Response) {
    try {
      const workspaceId = req.params.workspaceId!
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || req.headers.origin || 'http://localhost:3000'

      const state = Buffer.from(JSON.stringify({ workspaceId })).toString('base64')

      const discordClientId =
        process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID
      const discordRedirectUri = `${baseUrl}/api/auth/callback/discord`
      const discordScopes = ['bot', 'applications.commands']
      const discordPermissions = '274877975552'

      const discordParams = new URLSearchParams({
        client_id: discordClientId || '',
        redirect_uri: discordRedirectUri,
        response_type: 'code',
        scope: discordScopes.join(' '),
        permissions: discordPermissions,
        state,
      })

      const slackClientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || process.env.SLACK_CLIENT_ID
      const slackRedirectUri = `${baseUrl}/api/auth/callback/slack`
      const slackScopes = [
        'app_mentions:read',
        'channels:history',
        'channels:read',
        'chat:write',
        'commands',
        'im:history',
        'im:read',
        'im:write',
        'users:read',
      ]

      const slackParams = new URLSearchParams({
        client_id: slackClientId || '',
        redirect_uri: slackRedirectUri,
        scope: slackScopes.join(','),
        state,
      })

      res.json({
        workspaceId,
        discord: {
          url: discordClientId
            ? `https://discord.com/api/oauth2/authorize?${discordParams.toString()}`
            : null,
          clientIdConfigured: !!discordClientId,
          redirectUri: discordRedirectUri,
        },
        slack: {
          url: slackClientId
            ? `https://slack.com/oauth/v2/authorize?${slackParams.toString()}`
            : null,
          clientIdConfigured: !!slackClientId,
          redirectUri: slackRedirectUri,
        },
      })
    } catch (error: any) {
      log.error({ err: error }, 'Error getting OAuth URLs')
      throw new InternalServerError(error.message)
    }
  }
}

export const integrationDiagnosticsController = new IntegrationDiagnosticsController()
