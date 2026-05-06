import { Router } from 'express'
import multer from 'multer'
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole } from '@middleware/auth'
import { workspaceMcpController } from '@domains/mcp/controller/workspace-mcp.controller'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
})

// Sources and presets
router.get(
  '/mcp/sources',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceMcpController.getSources,
)
router.get('/mcp/presets', requireAuth(), workspaceMcpController.getPresets)

// MCP config CRUD
router.get('/mcp', requireAuth(), requireWorkspaceAccess(), workspaceMcpController.getConfig)
router.put(
  '/mcp',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.updateConfig,
)

// Server management
router.post(
  '/mcp/servers/:serverName/enable',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.enableServer,
)
router.post(
  '/mcp/servers/:serverName/disable',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.disableServer,
)
router.delete(
  '/mcp/servers/:serverName',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.deleteServer,
)
router.patch(
  '/mcp/servers/:serverName/toggle',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.toggleServer,
)
router.patch(
  '/mcp/servers/:serverName',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.updateServer,
)
router.patch(
  '/mcp/servers/:serverName/env',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.updateServerEnv,
)
router.post(
  '/mcp/servers/:serverName',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.addServer,
)

// Testing and OAuth
router.post(
  '/mcp/servers/:serverName/test-connection',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceMcpController.testConnection,
)
router.get(
  '/mcp/servers/:serverName/oauth-status',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceMcpController.getOAuthStatus,
)
router.post(
  '/mcp/servers/:serverName/initiate-oauth',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceMcpController.initiateOAuth,
)
router.post(
  '/mcp/servers/:serverName/mark-authorized',
  requireAuth(),
  requireWorkspaceAccess(),
  workspaceMcpController.markAuthorized,
)
router.delete(
  '/mcp/servers/:serverName/oauth',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.clearOAuth,
)

// Workspace MCP operations
router.post('/mcp/initialize', requireAuth(), workspaceMcpController.initialize)
router.post(
  '/mcp/copy',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.copyConfig,
)

// Credentials
router.post(
  '/mcp/upload-credential',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  upload.single('file'),
  workspaceMcpController.uploadCredential,
)
router.delete(
  '/mcp/credentials/:serverName',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.deleteCredentials,
)

// Restart/reconnect
router.post(
  '/mcp/servers/:serverName/restart',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.restartServer,
)
router.post(
  '/mcp/restart',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  workspaceMcpController.restartAll,
)

export default router
