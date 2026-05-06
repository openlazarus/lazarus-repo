import { Router } from 'express'
import { requireAuth } from '@middleware/auth'
import { mcpController } from '@domains/mcp/controller/mcp.controller'

export const mcpRouter = Router()

// ─── MCP Server CRUD ─────────────────────────────────────────────────────────

mcpRouter.get('/servers', requireAuth(), (req, res) => mcpController.listServers(req, res))
mcpRouter.post('/servers/:serverName/enable', requireAuth(), (req, res) =>
  mcpController.enableServer(req, res),
)
mcpRouter.post('/servers/:serverName/disable', requireAuth(), (req, res) =>
  mcpController.disableServer(req, res),
)
mcpRouter.post('/servers/:serverName', requireAuth(), (req, res) =>
  mcpController.addServer(req, res),
)
mcpRouter.delete('/servers/:serverName', requireAuth(), (req, res) =>
  mcpController.removeServer(req, res),
)
mcpRouter.patch('/servers/:serverName/env', requireAuth(), (req, res) =>
  mcpController.updateServerEnv(req, res),
)

// ─── MCP Configuration & Presets ─────────────────────────────────────────────

mcpRouter.get('/config', requireAuth(), (req, res) => mcpController.getConfig(req, res))
mcpRouter.get('/presets', requireAuth(), (req, res) => mcpController.getPresets(req, res))
mcpRouter.get('/categories', requireAuth(), (req, res) => mcpController.getCategories(req, res))

// ─── Server Validation & Status ──────────────────────────────────────────────

mcpRouter.post('/servers/validate', requireAuth(), (req, res) =>
  mcpController.validateServer(req, res),
)
mcpRouter.get('/servers/:serverName/status', requireAuth(), (req, res) =>
  mcpController.getServerStatus(req, res),
)
mcpRouter.post('/servers/:serverName/test-connection', requireAuth(), (req, res) =>
  mcpController.testConnection(req, res),
)
mcpRouter.post('/servers/from-preset', requireAuth(), (req, res) =>
  mcpController.addFromPreset(req, res),
)

// ─── OAuth Callback ──────────────────────────────────────────────────────────

mcpRouter.get('/oauth/callback', (req, res) => mcpController.oauthCallback(req, res))
