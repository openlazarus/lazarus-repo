import { Request, Response } from 'express'
import { teamService } from '@domains/team/service/team.service'
import { teamRepository } from '@domains/team/repository/team.repository'
import { ForbiddenError, NotFoundError, ConflictError } from '@errors/api-errors'

class TeamsController {
  async list(req: Request, res: Response) {
    const userId = req.user!.id

    const teams = await teamService.listTeams(userId)

    res.json({
      teams,
      count: teams.length,
    })
  }

  async create(req: Request, res: Response) {
    const userId = req.user!.id

    const team = await teamService.createTeam({
      ...req.body,
      owner_id: userId,
    })

    res.status(201).json({
      team,
      message: 'Team created successfully',
    })
  }

  async get(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    try {
      const team = await teamService.getTeam(teamId, userId)

      if (!team) {
        throw new NotFoundError('Team', teamId)
      }

      res.json({ team })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a member')) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  }

  async update(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    try {
      const team = await teamService.updateTeam(teamId, userId, req.body)

      res.json({
        team,
        message: 'Team updated successfully',
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Only team owners')) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  }

  async delete(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    try {
      await teamService.deleteTeam(teamId, userId)

      res.json({
        message: 'Team deleted successfully',
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Only team owners')) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  }

  async getMembers(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    try {
      const members = await teamService.getMembers(teamId, userId)

      res.json({
        members,
        count: members.length,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a member')) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  }

  async addMember(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    try {
      const member = await teamService.addMember(teamId, userId, req.body.userId, req.body.role)

      res.status(201).json({
        member,
        message: 'Member added successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          throw new ForbiddenError(error.message)
        }
        if (error.message.includes('already a member')) {
          throw new ConflictError(error.message)
        }
      }
      throw error
    }
  }

  async removeMember(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!
    const memberId = req.params.memberId!

    try {
      await teamService.removeMember(teamId, userId, memberId)

      res.json({
        message: 'Member removed successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          throw new ForbiddenError(error.message)
        }
        if (error.message.includes('Cannot remove the team owner')) {
          throw new ForbiddenError(error.message)
        }
      }
      throw error
    }
  }

  async updateMemberRole(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!
    const memberId = req.params.memberId!

    try {
      const member = await teamService.updateMemberRole(teamId, userId, memberId, req.body.role)

      res.json({
        member,
        message: 'Member role updated successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          throw new ForbiddenError(error.message)
        }
        if (error.message.includes('Cannot change the role of the team owner')) {
          throw new ForbiddenError(error.message)
        }
      }
      throw error
    }
  }

  async getRole(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    const role = await teamService.getUserRole(teamId, userId)

    if (!role) {
      throw new NotFoundError('User is not a member of this team')
    }

    res.json({ role })
  }

  async getWorkspaces(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.params.teamId!

    const role = await teamService.getUserRole(teamId, userId)
    if (!role) {
      throw new ForbiddenError('User is not a member of this team')
    }

    const workspaces = await teamRepository.getWorkspacesByTeamId(teamId)

    res.json({
      workspaces,
      count: workspaces.length,
    })
  }
}

export const teamsController = new TeamsController()
