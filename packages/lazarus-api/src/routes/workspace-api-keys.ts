import { Router } from 'express'
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole } from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { CreateApiKeySchema } from '../domains/workspace/types/workspace-api-keys.schemas'
import { workspaceApiKeysController } from '@domains/workspace/controller/workspace-api-keys.controller'

const router = Router()

router.get('/all', requireAuth(), (req, res) => workspaceApiKeysController.listAll(req, res))
router.post(
  '/api-keys',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'developer'),
  validateBody(CreateApiKeySchema),
  (req, res) => workspaceApiKeysController.create(req, res),
)
router.get('/api-keys', requireAuth(), (req, res) => workspaceApiKeysController.list(req, res))
router.get('/api-keys/:keyId', requireAuth(), (req, res) =>
  workspaceApiKeysController.get(req, res),
)
router.delete('/api-keys/:keyId', requireAuth(), (req, res) =>
  workspaceApiKeysController.revoke(req, res),
)

export default router
