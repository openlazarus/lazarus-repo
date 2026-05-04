import { Request, Response } from 'express'
import { invitationService } from '@domains/invitation/service/invitation.service'
import { teamService } from '@domains/team/service/team.service'
import { invitationRepository } from '@domains/invitation/repository/invitation.repository'
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('invitations')

class InvitationsController {
  async create(req: Request, res: Response) {
    const userId = req.user!.id

    const { email, teamId, workspaceId, role } = req.body

    try {
      const invitation = await invitationService.createInvitation({
        email,
        teamId,
        workspaceId,
        role,
        invitedBy: userId,
      })

      const team = await teamService.getTeam(teamId)
      if (!team) {
        throw new NotFoundError('Team', teamId)
      }

      const inviterProfile = await invitationRepository.getProfileById(userId)

      const inviterName = inviterProfile?.first_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name || ''}`.trim()
        : inviterProfile?.email || 'A team member'

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const acceptUrl = `${baseUrl}/accept-invitation?token=${invitation.token}`

      invitationService
        .sendInvitationEmail(invitation, team.name, inviterName, acceptUrl)
        .catch((error) => {
          log.error({ err: error }, 'Failed to send invitation email')
        })

      res.status(201).json({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          team_id: invitation.workspace_id,
          workspace_id: invitation.workspace_id,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
        },
        message: 'Invitation sent successfully',
        acceptUrl,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only team admins')) {
          throw new ForbiddenError(error.message)
        }
        if (
          error.message.includes('already a member') ||
          error.message.includes('already pending')
        ) {
          throw new ConflictError(error.message)
        }
      }
      throw error
    }
  }

  async accept(req: Request, res: Response) {
    const userId = req.user!.id

    const profile = await invitationRepository.getProfileEmailById(userId)

    if (!profile) {
      throw new NotFoundError('User profile')
    }

    try {
      await invitationService.acceptInvitation(req.body.token, userId, profile.email)

      res.json({
        message: 'Invitation accepted successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('Invalid or expired') ||
          error.message.includes('not found') ||
          error.message.includes('has expired')
        ) {
          throw new BadRequestError(error.message)
        }
        if (error.message.includes('different email')) {
          throw new ForbiddenError(error.message)
        }
      }
      throw error
    }
  }

  async list(req: Request, res: Response) {
    const userId = req.user!.id
    const teamId = req.query.teamId as string

    if (!teamId) {
      throw new BadRequestError('teamId query parameter required')
    }

    try {
      const invitations = await invitationService.listInvitations(teamId, userId)

      res.json({
        invitations,
        count: invitations.length,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a member')) {
        throw new ForbiddenError(error.message)
      }
      throw error
    }
  }

  async cancel(req: Request, res: Response) {
    const userId = req.user!.id
    const invitationId = req.params.invitationId!

    try {
      await invitationService.cancelInvitation(invitationId, userId)

      res.json({
        message: 'Invitation canceled successfully',
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new NotFoundError('Invitation', invitationId)
        }
        if (error.message.includes('Only team admins')) {
          throw new ForbiddenError(error.message)
        }
      }
      throw error
    }
  }

  async expireOld(_req: Request, res: Response) {
    const expiredCount = await invitationService.expireOldInvitations()

    res.json({
      message: 'Old invitations expired successfully',
      count: expiredCount,
    })
  }
}

export const invitationsController = new InvitationsController()
