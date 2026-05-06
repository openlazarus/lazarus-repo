/**
 * Background Process Monitoring API
 *
 * Endpoints for monitoring and managing background processes
 */

import { Router } from 'express'
import { requireAuth } from '@middleware/auth'
import { backgroundController } from '@shared/controller/background.controller'

export const backgroundRouter = Router()

backgroundRouter.get('/health', (req, res) => backgroundController.getHealth(req, res))
backgroundRouter.get('/stats', requireAuth(), (req, res) => backgroundController.getStats(req, res))
backgroundRouter.post('/workspaces/:workspaceId/reload', requireAuth(), (req, res) =>
  backgroundController.reloadWorkspace(req, res),
)
backgroundRouter.post('/workspaces/:workspaceId/load', requireAuth(), (req, res) =>
  backgroundController.loadWorkspace(req, res),
)
backgroundRouter.post('/workspaces/:workspaceId/unload', requireAuth(), (req, res) =>
  backgroundController.unloadWorkspace(req, res),
)
