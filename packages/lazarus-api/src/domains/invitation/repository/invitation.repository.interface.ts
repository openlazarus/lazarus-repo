import type { InvitationRow } from './invitation.repository'

export interface IInvitationRepository {
  /** Find a profile by email address. */
  findProfileByEmail(email: string): Promise<{ id: string } | null>
  /** Find a workspace member by workspace and user ID. */
  findWorkspaceMember(workspaceId: string, userId: string): Promise<{ id: string } | null>
  /** Find a pending invitation for an email and workspace. */
  findPendingInvitation(email: string, workspaceId: string): Promise<{ id: string } | null>
  /** Insert a new invitation. */
  insertInvitation(params: {
    email: string
    workspace_id: string
    role: string
    invited_by: string
    status: string
    token: string
    expires_at: string
  }): Promise<InvitationRow>
  /** Find an invitation by its token. */
  findInvitationByToken(token: string): Promise<InvitationRow | null>
  /** Update the status of an invitation. */
  updateInvitationStatus(invitationId: string, status: string): Promise<void>
  /** Insert a workspace member record. */
  insertWorkspaceMember(params: {
    workspace_id: string
    user_id: string
    role: string
    invited_by: string
  }): Promise<{ error: any | null }>
  /** List all pending invitations for a workspace. */
  listPendingInvitations(workspaceId: string): Promise<InvitationRow[]>
  /** Find an invitation by its ID. */
  findInvitationById(invitationId: string): Promise<{ workspace_id: string | null } | null>
  /** Delete an invitation by its ID. */
  deleteInvitation(invitationId: string): Promise<void>
  /** Expire old pending invitations past their expiry date. */
  expireOldInvitations(): Promise<number>
  /** Get a profile by user ID (name + email). */
  getProfileById(
    userId: string,
  ): Promise<{ first_name: string | null; last_name: string | null; email: string } | null>
  /** Get a profile email by user ID. */
  getProfileEmailById(userId: string): Promise<{ email: string } | null>
}
