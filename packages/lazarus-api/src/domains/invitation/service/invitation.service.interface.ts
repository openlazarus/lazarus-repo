import type { Invitation, CreateInvitationParams } from '@domains/invitation/types/invitation.types'

export interface IInvitationService {
  /** Create an invitation. */
  createInvitation(params: CreateInvitationParams): Promise<Invitation>

  /** Send an invitation email. */
  sendInvitationEmail(
    invitation: Invitation,
    teamName: string,
    inviterName: string,
    acceptUrl: string,
  ): Promise<void>

  /** Accept an invitation by token. */
  acceptInvitation(token: string, userId: string, userEmail: string): Promise<void>

  /** List pending invitations for a team. */
  listInvitations(teamId: string, userId: string): Promise<Invitation[]>

  /** Cancel a pending invitation. */
  cancelInvitation(invitationId: string, userId: string): Promise<void>

  /** Expire old invitations (cron job helper). */
  expireOldInvitations(): Promise<number>
}
