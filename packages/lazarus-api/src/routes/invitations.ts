/**
 * Invitation Routes
 *
 * REST API endpoints for managing team invitations.
 */

import { Router } from 'express'
import {
  CreateInvitationSchema,
  AcceptInvitationSchema,
} from '../domains/invitation/types/invitation.schemas'
import { requireAuth } from '@middleware/auth'
import { requireCronSecret } from '@middleware/cron-secret'
import { validateBody } from '@middleware/validate'
import { invitationsController } from '@domains/invitation/controller/invitations.controller'

export const invitationRouter = Router()

invitationRouter.post('/', requireAuth(), validateBody(CreateInvitationSchema), (req, res) =>
  invitationsController.create(req, res),
)
invitationRouter.post('/accept', requireAuth(), validateBody(AcceptInvitationSchema), (req, res) =>
  invitationsController.accept(req, res),
)
invitationRouter.get('/', requireAuth(), (req, res) => invitationsController.list(req, res))
invitationRouter.delete('/:invitationId', requireAuth(), (req, res) =>
  invitationsController.cancel(req, res),
)
invitationRouter.post('/expire-old', requireCronSecret(), (req, res) =>
  invitationsController.expireOld(req, res),
)
