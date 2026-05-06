/**
 * Approvals Router
 *
 * REST endpoints for managing background agent approval requests.
 * All endpoints are workspace-scoped and require authentication.
 */

import { Router } from 'express'
import { requireAuth, requireWorkspaceAccess } from '@middleware/auth'
import { approvalsController } from '@domains/permission/controller/approvals.controller'

export const approvalsRouter = Router()

approvalsRouter.get('/approvals', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  approvalsController.list(req, res),
)
approvalsRouter.get('/approvals/count', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  approvalsController.getCount(req, res),
)
approvalsRouter.get('/approvals/:approvalId', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  approvalsController.get(req, res),
)
approvalsRouter.post(
  '/approvals/:approvalId/resolve',
  requireAuth(),
  requireWorkspaceAccess(),
  (req, res) => approvalsController.resolve(req, res),
)
