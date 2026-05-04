import { Router } from 'express'
import {
  AppendMessageSchema,
  CreateSessionSchema,
  UpdateSessionSchema,
} from '../domains/conversation/types/session.schemas'
import { requireAuth } from '@middleware/auth'
import { extractWorkspaceId } from '@middleware/workspace-id'
import { validateBody } from '@middleware/validate'
import { sessionsController } from '@domains/conversation/controller/sessions.controller'

const router = Router()

router.post(
  '/',
  requireAuth(),
  extractWorkspaceId(),
  validateBody(CreateSessionSchema),
  (req, res) => sessionsController.create(req, res),
)
router.get('/', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.list(req, res),
)
router.get('/:sessionId', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.get(req, res),
)
router.patch(
  '/:sessionId',
  requireAuth(),
  extractWorkspaceId(),
  validateBody(UpdateSessionSchema),
  (req, res) => sessionsController.update(req, res),
)
router.post(
  '/:sessionId/messages',
  requireAuth(),
  extractWorkspaceId(),
  validateBody(AppendMessageSchema),
  (req, res) => sessionsController.appendMessage(req, res),
)
router.get('/:sessionId/transcript', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.getTranscript(req, res),
)
router.post('/:sessionId/complete', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.complete(req, res),
)
router.post('/:sessionId/interrupt', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.interrupt(req, res),
)
router.delete('/:sessionId', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.delete(req, res),
)
router.get('/:sessionId/export', requireAuth(), extractWorkspaceId(), (req, res) =>
  sessionsController.export(req, res),
)
router.post('/import', requireAuth(), (req, res) => sessionsController.import(req, res))
router.post('/cleanup', requireAuth(), (req, res) => sessionsController.cleanup(req, res))

export default router
