import 'express-async-errors'
import express, { Express, Request, Response } from 'express'
import './load-env'
import * as Sentry from '@sentry/node'
import logger from './utils/logger'
import { apiKeyCors, standardCors } from './middleware/cors'
import { errorHandler } from './middleware/error-handler'
import { jsonWithRawBody, urlencodedWithRawBody } from './middleware/raw-body'
import { apiRateLimit } from './middleware/rate-limit'
import { requestLogger } from './middleware/request-logger'
import { setupWebSocketServer } from './realtime'
import { BackgroundPermissionManager } from './domains/permission/service/background-permission-manager'
import { librarianProcessor } from './background/librarian-processor.service'
import { memoryPressureMonitor } from './domains/chat/service/memory-pressure-monitor'
import { mcpRouter } from './routes/mcp'
import { filesApiRouter } from './routes/files-api'
import { chatRouter } from './routes/chat'
import { workspaceRouter } from './routes/workspaces'
import sessionsRouter from './routes/sessions'
import conversationsRouter from './routes/conversations'
import workspaceMCPRouter from './routes/workspace-mcp'
import userMCPRouter from './routes/user-mcp'
import v0ToolsRouter from './routes/v0-tools' // v0 SDK tools
import sqliteToolsRouter from './routes/sqlite-tools' // SQLite tools
import { knowledgeRouter } from './routes/knowledge' // Knowledge graph and librarian
import { activityRouter } from './routes/activity' // Activity logging
import { agentWebhooksRouter } from './routes/agent-webhooks' // Agent email webhooks
import { workspaceAgentsRouter } from './routes/workspace-agents' // Workspace-based agents
import { approvalsRouter } from './routes/approvals' // Workspace approval queue
import { workspaceActivityRouter } from './routes/workspace-activity' // Workspace-based activity logs
import workspaceApiKeysRouter from './routes/workspace-api-keys' // Workspace API key management
import sqliteRestRouter from './routes/sqlite-rest' // SQLite REST API (API key authenticated)
import v0AuthRouter from './routes/v0-auth' // V0 app authentication
import v0AppsRouter from './routes/v0-apps' // V0 apps management
import { emailRouterRouter } from './routes/email-router' // Email routing for workspace subdomains
import { whatsappRouter } from './routes/whatsapp-router' // WhatsApp webhook handling via Kapso
import { teamRouter } from './routes/teams' // Team management
import { invitationRouter } from './routes/invitations' // Team invitations
import { backgroundRouter } from './routes/background' // Background process monitoring
import discordWebhookRouter from './routes/discord-webhook' // Discord webhook handling
import discordSettingsRouter from './routes/discord-settings' // Discord settings management
import slackWebhookRouter from './routes/slack-webhook' // Slack webhook handling
import internalSlackWebhookRouter from './routes/internal-slack-webhook' // Slack webhook forwarded by orchestrator
import integrationDiagnosticsRouter from './routes/integration-diagnostics' // Integration diagnostics
import { internalSmokeTestRouter } from './routes/internal-smoke-test' // Internal smoke test impersonation
import { agentTriggerWebhooksRouter } from './routes/agent-trigger-webhooks' // Inbound user webhook endpoints
import { injectWorkspaceId } from './middleware/inject-workspace-id'

export function createApp(): Express {
  const app = express()

  // Trust proxy for ALB (Application Load Balancer)
  app.set('trust proxy', true)

  app.use(jsonWithRawBody())
  app.use(urlencodedWithRawBody())
  app.use('/api/db', apiKeyCors())
  app.use('/api/v0-auth', apiKeyCors())
  app.use(standardCors())
  app.use('/api', apiRateLimit())
  app.use(requestLogger())
  app.use(injectWorkspaceId)

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    const memory = memoryPressureMonitor.getStats()
    res.json({
      status: memory.underPressure ? 'degraded' : 'healthy',
      service: 'lazarus-api-ts',
      memory,
    })
  })

  // API Routes
  app.use('/api/mcp', mcpRouter) // MCP management routes
  app.use('/api/files', filesApiRouter) // Files API for workspaces
  app.use('/api/chat', chatRouter) // Chat API with streaming
  app.use('/api/workspaces', workspaceRouter) // Workspace management
  app.use('/api/workspaces', workspaceMCPRouter) // Workspace MCP configuration
  app.use('/api/workspaces', workspaceAgentsRouter) // Workspace-based agent management
  app.use('/api/workspaces', approvalsRouter) // Workspace approval queue
  app.use('/api/workspaces', workspaceActivityRouter) // Workspace-based activity logs
  app.use('/api/teams', teamRouter) // Team management
  app.use('/api/invitations', invitationRouter) // Team invitations
  app.use('/api/users', userMCPRouter) // User MCP templates
  app.use('/api/sessions', sessionsRouter) // Session management
  app.use('/api/conversations', conversationsRouter) // Conversation metadata
  app.use('/api/v0', v0ToolsRouter) // v0 project tools
  app.use('/api/sqlite', sqliteToolsRouter) // SQLite database tools
  app.use('/api', knowledgeRouter) // Knowledge graph and librarian
  app.use('/api/activity', activityRouter) // Activity logging
  app.use('/api/webhooks', agentWebhooksRouter) // Agent email webhooks
  app.use('/api/workspaces', workspaceApiKeysRouter) // Workspace API key management
  app.use('/api/workspaces', v0AppsRouter) // V0 apps management
  app.use('/api/db', sqliteRestRouter) // SQLite REST API (API key authenticated)
  app.use('/api/v0-auth', v0AuthRouter) // V0 app authentication
  app.use('/api/email', emailRouterRouter) // Email routing for workspace subdomains
  app.use('/api/whatsapp', whatsappRouter) // WhatsApp webhook handling via Kapso
  app.use('/api/background', backgroundRouter) // Background process monitoring
  app.use('/api/webhooks/discord', discordWebhookRouter) // Discord webhook handling
  app.use('/api/workspaces', discordSettingsRouter) // Discord connection settings
  app.use('/api/webhooks/slack', slackWebhookRouter) // Slack webhook handling
  app.use('/internal/webhooks/slack', internalSlackWebhookRouter) // Orchestrator-forwarded Slack events (instance-secret auth)
  app.use('/api/diagnostics/integrations', integrationDiagnosticsRouter) // Integration diagnostics
  app.use('/api/internal', internalSmokeTestRouter) // Internal smoke test (localhost only)
  app.use('/api/hooks', agentTriggerWebhooksRouter) // User-facing inbound webhook endpoints

  // Sentry error handler (must be before custom error handler)
  Sentry.setupExpressErrorHandler(app)

  // Centralized error handling middleware
  app.use(errorHandler)

  return app
}

export async function startServer() {
  const app = createApp()
  const port = parseInt(process.env.API_PORT || '8000', 10)
  const host = process.env.API_HOST || '0.0.0.0'

  try {
    const server = app.listen(port, host, async () => {
      logger.info({ host, port }, 'Lazarus API (TypeScript) running')
    })

    setupWebSocketServer(server)

    BackgroundPermissionManager.getInstance().recoverOnStartup()

    librarianProcessor.initialize().catch((err) => {
      logger.error({ err }, 'Failed to initialize librarian processor')
    })

    return server
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  }
}
