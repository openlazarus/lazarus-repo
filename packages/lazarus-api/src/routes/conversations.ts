import { Router } from 'express'
import { UpdateConversationSchema } from '../domains/conversation/types/conversation.schemas'
import { requireAuth } from '@middleware/auth'
import { extractWorkspaceId } from '@middleware/workspace-id'
import { validateBody } from '@middleware/validate'
import { conversationsController } from '@domains/conversation/controller/conversations.controller'

const router = Router()

router.get('/', requireAuth(), (req, res) => conversationsController.list(req, res))

// Static path segments before /:id — otherwise "by-session" is captured as :id
router.get('/by-session/:sessionId', requireAuth(), extractWorkspaceId(), (req, res) =>
  conversationsController.getBySession(req, res),
)

router.get('/:id', requireAuth(), extractWorkspaceId(), (req, res) =>
  conversationsController.getById(req, res),
)

router.patch(
  '/:id',
  requireAuth(),
  extractWorkspaceId(),
  validateBody(UpdateConversationSchema),
  (req, res) => conversationsController.update(req, res),
)

router.delete('/:id', requireAuth(), extractWorkspaceId(), (req, res) =>
  conversationsController.delete(req, res),
)

router.get('/:id/messages', requireAuth(), extractWorkspaceId(), (req, res) =>
  conversationsController.getMessages(req, res),
)

router.post('/:id/generate-title', requireAuth(), extractWorkspaceId(), (req, res) =>
  conversationsController.generateTitle(req, res),
)

export default router
