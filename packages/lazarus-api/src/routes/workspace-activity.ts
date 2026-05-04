/**
 * Workspace-scoped activity logging API routes.
 *
 * Provides endpoints for retrieving activity logs scoped to specific workspaces.
 * Frontend is READ-ONLY - only backend services can create activity logs.
 */

import { Router } from 'express'
import { requireAuth, requireWorkspaceAccess } from '@middleware/auth'
import { workspaceActivityController } from '@domains/activity/controller/workspace-activity.controller'

export const workspaceActivityRouter = Router()

workspaceActivityRouter.get('/activity', requireAuth(), requireWorkspaceAccess(), (req, res) =>
  workspaceActivityController.listActivity(req, res),
)
workspaceActivityRouter.get(
  '/activity/contributions',
  requireAuth(),
  requireWorkspaceAccess(),
  (req, res) => workspaceActivityController.getContributions(req, res),
)
workspaceActivityRouter.get(
  '/activity/:logId',
  requireAuth(),
  requireWorkspaceAccess(),
  (req, res) => workspaceActivityController.getActivityLog(req, res),
)
workspaceActivityRouter.get(
  '/activity/workflow/:workflowId',
  requireAuth(),
  requireWorkspaceAccess(),
  (req, res) => workspaceActivityController.getWorkflowActivity(req, res),
)
