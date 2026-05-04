import { Router } from 'express'
import { requireAuth } from '@middleware/auth'
import { v0ToolsController } from '@domains/v0/controller/v0-tools.controller'

const router = Router()

router.get('/chat/:chatId', requireAuth(), (req, res) => v0ToolsController.getChat(req, res))
router.get('/deployments', requireAuth(), (req, res) => v0ToolsController.getDeployments(req, res))
router.get('/manage-env-vars', requireAuth(), (req, res) => v0ToolsController.getEnvVars(req, res))
router.get('/deployment-logs/:deploymentId', requireAuth(), (req, res) =>
  v0ToolsController.getDeploymentLogs(req, res),
)

export default router
