// Server member model for Lazarus (formerly Workspace member)

/**
 * Server member role types
 */
export enum ServerMemberRole {
  Owner = 'owner',
  Admin = 'admin',
  Developer = 'developer',
  Editor = 'editor',
  Member = 'member',
  Viewer = 'viewer',
}

/**
 * Server member interface
 * Note: "server" is an alias for "workspace" in the UI
 */
export interface ServerMember {
  id: string // UUID
  workspace_id: string // VARCHAR (workspace ID)
  user_id: string // UUID
  role: ServerMemberRole
  invited_by?: string | null // UUID
  joined_at: Date | string
  created_at: Date | string
  updated_at?: Date | string
  // Nested profile data from Supabase join
  profiles?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    avatar: string | null
  }
}

/**
 * Server member with user profile data
 * @deprecated Use ServerMember with profiles field instead
 */
export interface ServerMemberWithProfile
  extends Omit<ServerMember, 'profiles'> {
  user: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    avatar: string | null
  }
}

/**
 * Check if user has write access
 */
export function canEditServer(role: ServerMemberRole): boolean {
  return [
    ServerMemberRole.Owner,
    ServerMemberRole.Admin,
    ServerMemberRole.Member,
  ].includes(role)
}

/**
 * Check if user has admin access
 */
export function isServerAdmin(role: ServerMemberRole): boolean {
  return [ServerMemberRole.Owner, ServerMemberRole.Admin].includes(role)
}

/**
 * Check if user is owner
 */
export function isServerOwner(role: ServerMemberRole): boolean {
  return role === ServerMemberRole.Owner
}
