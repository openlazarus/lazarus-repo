import { Router } from 'express'
import { requireAuth } from '@middleware/auth'
import { requireWorkspaceId } from '@middleware/workspace-id'
import { validateBody } from '@middleware/validate'
import { ExchangeTokenSchema, GenerateTokenSchema } from '../domains/v0/types/v0.schemas'
import { v0AuthController } from '@domains/v0/controller/v0-auth.controller'

const router = Router()

router.post(
  '/generate-token',
  requireAuth(),
  requireWorkspaceId(),
  validateBody(GenerateTokenSchema),
  (req, res) => v0AuthController.generateToken(req, res),
)
router.post('/exchange-token', validateBody(ExchangeTokenSchema), (req, res) =>
  v0AuthController.exchangeToken(req, res),
)
router.get('/stats', (req, res) => v0AuthController.getStats(req, res))

export default router
