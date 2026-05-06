/**
 * Team (workspace) domain types for Lazarus backend.
 */

export interface Team {
  id: string
  name: string
  slug: string | null
  owner_id: string
  description?: string | null
  avatar?: string | null
  settings: Record<string, any> | null
  created_at: string | null
  updated_at: string | null
}

export interface TeamMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  invited_by: string | null
  joined_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface TeamWithMembers extends Team {
  members?: Array<
    TeamMember & {
      profile?: {
        email: string
        first_name: string | null
        last_name: string | null
        avatar: string | null
      }
    }
  >
  member_count?: number
  workspace_count?: number
}

export interface CreateTeamParams {
  name: string
  slug?: string
  owner_id: string
  description?: string
  avatar?: string
  settings?: Record<string, any>
}

export interface UpdateTeamParams {
  name?: string
  slug?: string
  description?: string
  avatar?: string
  settings?: Record<string, any>
}
