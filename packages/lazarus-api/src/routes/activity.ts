import { Router } from 'express'
import { CreateActivityLogSchema } from '../domains/activity/types/activity.schemas'
import { requireAuth, requireWorkspaceAccess } from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { activityController } from '@domains/activity/controller/activity.controller'

export const activityRouter = Router()

activityRouter.post(
  '/logs',
  requireAuth(),
  requireWorkspaceAccess(),
  validateBody(CreateActivityLogSchema),
  (req, res) => activityController.createLog(req, res),
)

activityRouter.get('/logs', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.listLogs(req, res),
)

activityRouter.get('/logs/:id', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.getLog(req, res),
)

activityRouter.delete('/logs/:id', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.deleteLog(req, res),
)

activityRouter.get('/workflow/:workflowId', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.getWorkflowLogs(req, res),
)

activityRouter.get('/logs/:id/detail', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.getLogDetail(req, res),
)

activityRouter.get('/logs/:id/stream', requireAuth(), (req, res) =>
  activityController.streamLog(req, res),
)

activityRouter.post('/logs/:id/stop', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.stopLog(req, res),
)

activityRouter.get('/executing', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  activityController.getExecutingLogs(req, res),
)
