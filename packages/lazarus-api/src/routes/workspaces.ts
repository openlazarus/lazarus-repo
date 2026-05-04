import { Router } from 'express'
import multer from 'multer'
import {
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  UpdateWorkspaceMemberRoleSchema,
  CreateInvitationSchema,
  TransferWorkspaceSchema,
  UpdateConfigSchema,
} from '../domains/workspace/types/workspace.schemas'
import { requireAuth, requireWorkspaceAccess, requireWorkspaceAdmin } from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { workspacesController } from '@domains/workspace/controller/workspaces.controller'

export const workspaceRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
  },
})

// Workspace CRUD
workspaceRouter.get('/current', requireAuth(), requireWorkspaceAccess(), workspacesController.get)
workspaceRouter.put(
  '/',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  validateBody(UpdateWorkspaceSchema),
  workspacesController.update,
)
workspaceRouter.post(
  '/transfer',
  requireAuth(),
  requireWorkspaceAccess(),
  validateBody(TransferWorkspaceSchema),
  workspacesController.transfer,
)

// File operations
workspaceRouter.get(
  '/files',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.listFiles,
)
workspaceRouter.get(
  '/file/*',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.readFile,
)
workspaceRouter.put(
  '/file/*',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.writeFile,
)
workspaceRouter.post(
  '/upload',
  requireAuth(),
  requireWorkspaceAccess(),
  upload.single('file'),
  workspacesController.uploadFile,
)
workspaceRouter.delete(
  '/file/*',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.deleteFile,
)
workspaceRouter.post(
  '/move',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.moveFile,
)
workspaceRouter.post(
  '/directory',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.createDirectory,
)
workspaceRouter.post(
  '/file/lock',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.lockFile,
)
workspaceRouter.post(
  '/file/unlock',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.unlockFile,
)

// Workspace context and config
workspaceRouter.get(
  '/context',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.getContext,
)
workspaceRouter.get('/mcp', requireAuth(), requireWorkspaceAccess(), workspacesController.getMcp)
workspaceRouter.get(
  '/config',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.getConfig,
)
workspaceRouter.put(
  '/config',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  validateBody(UpdateConfigSchema),
  workspacesController.updateConfig,
)
workspaceRouter.post('/config/validate-slug', requireAuth(), workspacesController.validateSlug)

// Members
workspaceRouter.get(
  '/members',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.getMembers,
)
workspaceRouter.post(
  '/members',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  validateBody(AddWorkspaceMemberSchema),
  workspacesController.addMember,
)
workspaceRouter.delete(
  '/members/me',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.leaveWorkspace,
)
workspaceRouter.delete(
  '/members/:memberId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  workspacesController.removeMember,
)
workspaceRouter.patch(
  '/members/:memberId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  validateBody(UpdateWorkspaceMemberRoleSchema),
  workspacesController.updateMemberRole,
)

// Invitations
workspaceRouter.get(
  '/invitations',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.getInvitations,
)
workspaceRouter.post(
  '/invitations',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  validateBody(CreateInvitationSchema),
  workspacesController.createInvitation,
)
workspaceRouter.delete(
  '/invitations/:invitationId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  workspacesController.cancelInvitation,
)

// Template database
workspaceRouter.post(
  '/template-database',
  requireAuth(),
  requireWorkspaceAccess(),
  workspacesController.createTemplateDatabase,
)
