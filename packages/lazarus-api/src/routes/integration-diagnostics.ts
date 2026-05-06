import { Router } from 'express'
import { requireAuth, requireWorkspaceAccess } from '@middleware/auth'
import { integrationDiagnosticsController } from '@domains/integration/controller/integration-diagnostics.controller'

const router = Router()

router.get('/config', requireAuth(), (req, res) =>
  integrationDiagnosticsController.getConfig(req, res),
)

router.get('/connections/:workspaceId', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  integrationDiagnosticsController.getConnections(req, res),
)

router.get('/conversations/:workspaceId', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  integrationDiagnosticsController.getConversations(req, res),
)

router.post('/test-attachment/:workspaceId', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  integrationDiagnosticsController.testAttachment(req, res),
)

router.get('/webhook-endpoints', requireAuth(), (req, res) =>
  integrationDiagnosticsController.getWebhookEndpoints(req, res),
)

router.get('/oauth-urls/:workspaceId', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  integrationDiagnosticsController.getOAuthUrls(req, res),
)

export default router
