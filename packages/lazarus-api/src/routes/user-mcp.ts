import { Router } from 'express'
import { requireAuth, requireResourceOwner } from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { MCPServerSchema } from '../domains/mcp/types/mcp.schemas'
import { userMcpController } from '@domains/mcp/controller/user-mcp.controller'

const router = Router()

router.get(
  '/:userId/mcp-templates',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.getTemplates(req, res),
)
router.post(
  '/:userId/mcp-templates/initialize',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.initializeTemplates(req, res),
)
router.post(
  '/:userId/mcp-templates/:templateName',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  validateBody(MCPServerSchema),
  (req, res) => userMcpController.addTemplate(req, res),
)
router.put(
  '/:userId/mcp-templates',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.updateAllTemplates(req, res),
)
router.delete(
  '/:userId/mcp-templates/:templateName',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.removeTemplate(req, res),
)
router.post(
  '/:userId/mcp-templates/:templateName/activate',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.activateTemplate(req, res),
)
router.post(
  '/:userId/mcp-templates/deactivate',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.deactivateTemplate(req, res),
)
router.get(
  '/:userId/mcp-templates/available/:workspaceId',
  requireAuth(),
  requireResourceOwner((req) => req.params.userId!),
  (req, res) => userMcpController.getAvailableTemplates(req, res),
)

export default router
