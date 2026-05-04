import { Router } from 'express'
import { requireAuth } from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { SetupDeploymentSchema } from '../domains/v0/types/v0.schemas'
import { v0AppsController } from '@domains/v0/controller/v0-apps.controller'

const router = Router()

router.post(
  '/v0-apps/setup-deployment',
  requireAuth(),
  validateBody(SetupDeploymentSchema),
  (req, res) => v0AppsController.setupDeployment(req, res),
)
router.post('/v0-apps/regenerate-api-key', requireAuth(), (req, res) =>
  v0AppsController.regenerateApiKey(req, res),
)
router.post('/v0-apps/generate-token', requireAuth(), (req, res) =>
  v0AppsController.generateToken(req, res),
)

export default router
