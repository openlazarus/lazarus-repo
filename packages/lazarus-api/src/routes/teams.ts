/**
 * Team Routes
 *
 * REST API endpoints for team and team member management.
 */

import { Router } from 'express'
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  AddMemberSchema,
  UpdateMemberRoleSchema,
} from '../domains/team/types/team.schemas'
import { requireAuth } from '@middleware/auth'
import { validateBody } from '@middleware/validate'
import { teamsController } from '@domains/team/controller/teams.controller'

export const teamRouter = Router()

teamRouter.get('/', requireAuth(), (req, res) => teamsController.list(req, res))
teamRouter.post('/', requireAuth(), validateBody(CreateTeamSchema), (req, res) =>
  teamsController.create(req, res),
)
teamRouter.get('/:teamId', requireAuth(), (req, res) => teamsController.get(req, res))
teamRouter.put('/:teamId', requireAuth(), validateBody(UpdateTeamSchema), (req, res) =>
  teamsController.update(req, res),
)
teamRouter.delete('/:teamId', requireAuth(), (req, res) => teamsController.delete(req, res))
teamRouter.get('/:teamId/members', requireAuth(), (req, res) =>
  teamsController.getMembers(req, res),
)
teamRouter.post('/:teamId/members', requireAuth(), validateBody(AddMemberSchema), (req, res) =>
  teamsController.addMember(req, res),
)
teamRouter.delete('/:teamId/members/:memberId', requireAuth(), (req, res) =>
  teamsController.removeMember(req, res),
)
teamRouter.patch(
  '/:teamId/members/:memberId',
  requireAuth(),
  validateBody(UpdateMemberRoleSchema),
  (req, res) => teamsController.updateMemberRole(req, res),
)
teamRouter.get('/:teamId/role', requireAuth(), (req, res) => teamsController.getRole(req, res))
teamRouter.get('/:teamId/workspaces', requireAuth(), (req, res) =>
  teamsController.getWorkspaces(req, res),
)
