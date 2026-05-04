/**
 * Invitation Service
 *
 * Handles team invitation logic including:
 * - Creating invitations with tokens
 * - Sending invitation emails
 * - Accepting/declining invitations
 * - Expiring old invitations
 */

import { teamService } from '@domains/team/service/team.service'
import { invitationRepository } from '@domains/invitation/repository/invitation.repository'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import type {
  Invitation,
  CreateInvitationParams,
  InvitationToken,
} from '@domains/invitation/types/invitation.types'
import type { IInvitationService } from './invitation.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('invitation')

export class InvitationService implements IInvitationService {
  /**
   * Generate a secure invitation token
   */
  private generateToken(params: CreateInvitationParams): string {
    const tokenData: InvitationToken = {
      email: params.email,
      teamId: params.teamId,
      workspaceId: params.workspaceId,
      role: params.role || 'member',
      invitedBy: params.invitedBy,
      timestamp: Date.now(),
    }

    // Base64 encode the token data
    return Buffer.from(JSON.stringify(tokenData)).toString('base64')
  }

  /**
   * Parse and validate an invitation token
   */
  private parseToken(token: string): InvitationToken | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const tokenData: InvitationToken = JSON.parse(decoded)

      // Validate token age (7 days)
      const expiryTime = 7 * 24 * 60 * 60 * 1000 // 7 days
      if (Date.now() - tokenData.timestamp > expiryTime) {
        return null
      }

      return tokenData
    } catch (error) {
      log.error({ err: error }, 'Invalid token')
      return null
    }
  }

  /**
   * Check if user already exists
   */
  private async getUserByEmail(email: string): Promise<{ id: string } | null> {
    return invitationRepository.findProfileByEmail(email)
  }

  /**
   * Create an invitation
   */
  async createInvitation(params: CreateInvitationParams): Promise<Invitation> {
    const workspaceId = params.workspaceId ?? params.teamId

    // Verify inviter is admin
    const isAdmin = await workspaceRepository.isWorkspaceAdmin(params.invitedBy, workspaceId)
    if (!isAdmin) {
      throw new Error('Only team admins can send invitations')
    }

    // Check if user is already a member
    const existingUser = await this.getUserByEmail(params.email)
    if (existingUser) {
      const existingMember = await invitationRepository.findWorkspaceMember(
        workspaceId,
        existingUser.id,
      )

      if (existingMember) {
        throw new Error('User is already a member of this team')
      }
    }

    // Check for pending invitation
    const pendingInvitation = await invitationRepository.findPendingInvitation(
      params.email,
      workspaceId,
    )

    if (pendingInvitation) {
      throw new Error('An invitation is already pending for this email')
    }

    // Generate token
    const token = this.generateToken(params)

    // Calculate expiry (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation record
    const invitation = await invitationRepository.insertInvitation({
      email: params.email,
      workspace_id: workspaceId,
      role: params.role || 'member',
      invited_by: params.invitedBy,
      status: 'pending',
      token,
      expires_at: expiresAt.toISOString(),
    })

    return invitation as Invitation
  }

  /**
   * Send invitation email
   * Note: This is a simplified version. In production, you might want to use
   * a proper email template service like the frontend's Resend integration.
   */
  async sendInvitationEmail(
    invitation: Invitation,
    teamName: string,
    inviterName: string,
    acceptUrl: string,
  ): Promise<void> {
    try {
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Invitation to ${teamName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px;">
            <h1 style="color: #111827; margin: 0 0 20px 0;">You're invited to join ${teamName}</h1>

            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              ${inviterName} has invited you to join <strong>${teamName}</strong> on Lazarus.
            </p>

            <p style="color: #374151; font-size: 16px; line-height: 1.5;">
              You'll be joining as a <strong>${invitation.role}</strong>.
            </p>

            <div style="margin: 30px 0;">
              <a href="${acceptUrl}"
                 style="background-color: #0098FC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
              This invitation will expire in 7 days for security reasons.
            </p>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
              Sent by Lazarus Team Management
            </p>
          </div>
        </body>
        </html>
      `

      const textBody = `
You're invited to join ${teamName}

${inviterName} has invited you to join ${teamName} on Lazarus.

You'll be joining as a ${invitation.role}.

Accept your invitation by visiting:
${acceptUrl}

This invitation will expire in 7 days for security reasons.

If you didn't expect this invitation, you can safely ignore this email.

---
Sent by Lazarus Team Management
      `

      // For now, log the email (in production, use SES or other email service)
      log.info(
        {
          to: invitation.email,
          subject: `You've been invited to join ${teamName}`,
          acceptUrl,
          htmlBodyLength: htmlBody.length,
          textBodyLength: textBody.length,
        },
        'Would send email',
      )

      // TODO: Integrate with SES email sender or other email service
      // This would require proper email domain verification and configuration
      /*
      await sesEmailSender.sendEmail('system', 'system', 'system', {
        from: process.env.INVITATION_FROM_EMAIL ?? 'team@example.com',
        to: [invitation.email],
        subject: `You've been invited to join ${teamName}`,
        body: {
          text: textBody,
          html: htmlBody
        }
      })
      */
    } catch (error) {
      log.error({ err: error }, 'Error sending email')
      // Don't throw - invitation is already created, email is best effort
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string, userEmail: string): Promise<void> {
    // Parse and validate token
    const tokenData = this.parseToken(token)
    if (!tokenData) {
      throw new Error('Invalid or expired invitation token')
    }

    // Verify email matches
    if (tokenData.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Invitation is for a different email address')
    }

    // Get invitation from database
    const invitation = await invitationRepository.findInvitationByToken(token)

    if (!invitation) {
      throw new Error('Invitation not found or already used')
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await invitationRepository.updateInvitationStatus(invitation.id, 'expired')

      throw new Error('Invitation has expired')
    }

    const workspaceId = invitation.workspace_id ?? tokenData.teamId
    if (!workspaceId) {
      throw new Error('Invitation is missing workspace context')
    }

    // Add user to workspace (teamId in API is workspace-scoped)
    await teamService.addMember(
      workspaceId,
      invitation.invited_by,
      userId,
      invitation.role as 'admin' | 'member',
    )

    // If workspace invitation, add to workspace
    if (invitation.workspace_id) {
      const { error: workspaceError } = await invitationRepository.insertWorkspaceMember({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role as string,
        invited_by: invitation.invited_by,
      })

      if (workspaceError) {
        log.error({ err: workspaceError }, 'Error adding to workspace')
        // Don't throw - user is already added to org
      }
    }

    // Mark invitation as accepted
    await invitationRepository.updateInvitationStatus(invitation.id, 'accepted')
  }

  /**
   * List pending invitations for an team
   */
  async listInvitations(teamId: string, userId: string): Promise<Invitation[]> {
    // Verify user is a member
    const member = await invitationRepository.findWorkspaceMember(teamId, userId)

    if (!member) {
      throw new Error('User is not a member of this team')
    }

    const invitations = await invitationRepository.listPendingInvitations(teamId)
    return invitations as Invitation[]
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    // Get invitation to verify permissions
    const invitation = await invitationRepository.findInvitationById(invitationId)

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    const workspaceId = invitation.workspace_id
    if (!workspaceId) {
      throw new Error('Invitation is missing workspace context')
    }

    // Verify user is admin
    const isAdmin = await workspaceRepository.isWorkspaceAdmin(userId, workspaceId)
    if (!isAdmin) {
      throw new Error('Only team admins can cancel invitations')
    }

    // Delete the invitation
    await invitationRepository.deleteInvitation(invitationId)
  }

  /**
   * Expire old invitations (cron job helper)
   */
  async expireOldInvitations(): Promise<number> {
    return invitationRepository.expireOldInvitations()
  }
}

export const invitationService: IInvitationService = new InvitationService()
