import { Router } from 'express'
import { requireAuth, requireWorkspaceAccess, requireWorkspaceEditor } from '@middleware/auth'
import { filesApiController } from '@domains/file/controller/files-api.controller'

const router = Router()

// Read file from workspace by workspace ID
router.get('/workspace/read', requireAuth(), requireWorkspaceAccess(), (req, res, next) =>
  filesApiController.readFile(req, res, next),
)

// Write file to workspace
router.post(
  '/workspace/write',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  (req, res, next) => filesApiController.writeFile(req, res, next),
)

// List files in workspace
router.get('/workspace', requireAuth(), requireWorkspaceAccess(), (req, res, next) =>
  filesApiController.listFiles(req, res, next),
)

// Delete file from workspace
router.delete(
  '/workspace',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  (req, res, next) => filesApiController.deleteFile(req, res, next),
)

// Get file version history
router.get('/workspace/history', requireAuth(), requireWorkspaceAccess(), (req, res, next) =>
  filesApiController.getHistory(req, res, next),
)

// Get specific file version
router.get(
  '/workspace/version/:versionId',
  requireAuth(),
  requireWorkspaceAccess(),
  (req, res, next) => filesApiController.getVersion(req, res, next),
)

// Restore file from version
router.post(
  '/workspace/restore',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceEditor(),
  (req, res, next) => filesApiController.restoreFile(req, res, next),
)

export { router as filesApiRouter }
