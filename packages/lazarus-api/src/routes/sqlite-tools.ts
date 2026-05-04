import { Router } from 'express'
import { requireAuth, requireWorkspaceAccess } from '@middleware/auth'
import { extractWorkspaceId } from '@middleware/workspace-id'
import { sqliteToolsController } from '@domains/sqlite/controller/sqlite-tools.controller'

const router = Router()

router.get(
  '/list-databases',
  requireAuth(),
  extractWorkspaceId(),
  requireWorkspaceAccess(),
  (req, res) => sqliteToolsController.listDatabases(req, res),
)

router.post(
  '/create-database',
  requireAuth(),
  extractWorkspaceId(),
  requireWorkspaceAccess(),
  (req, res) => sqliteToolsController.createDatabase(req, res),
)

router.post('/query', requireAuth(), extractWorkspaceId(), requireWorkspaceAccess(), (req, res) =>
  sqliteToolsController.query(req, res),
)

router.post('/execute', requireAuth(), extractWorkspaceId(), requireWorkspaceAccess(), (req, res) =>
  sqliteToolsController.execute(req, res),
)

router.get(
  '/schema-info',
  requireAuth(),
  extractWorkspaceId(),
  requireWorkspaceAccess(),
  (req, res) => sqliteToolsController.getSchemaInfo(req, res),
)

router.post('/export', requireAuth(), extractWorkspaceId(), requireWorkspaceAccess(), (req, res) =>
  sqliteToolsController.exportDatabase(req, res),
)

export default router
