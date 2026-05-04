/**
 * Team invitation domain types for Lazarus backend.
 */

export interface Invitation {
  id: string
  email: string
  workspace_id: string | null
  role: string
  invited_by: string
  status: 'pending' | 'accepted' | 'expired'
  token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface CreateInvitationParams {
  email: string
  teamId: string
  workspaceId?: string
  role?: string
  invitedBy: string
}

export interface InvitationToken {
  email: string
  teamId: string
  workspaceId?: string
  role: string
  invitedBy: string
  timestamp: number
}
