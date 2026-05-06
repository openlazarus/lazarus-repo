import type { WorkspaceRow, WorkspaceMemberRow } from './team.repository'

export interface ITeamRepository {
  /** Check whether a workspace slug already exists. */
  slugExists(slug: string): Promise<boolean>
  /** Create a new workspace. */
  createWorkspace(params: {
    name: string
    slug: string
    owner_id: string
    description?: string | null
    avatar?: string | null
    settings?: Record<string, any>
  }): Promise<WorkspaceRow>
  /** Hard-delete a workspace. */
  deleteWorkspace(id: string): Promise<void>
  /** Get a workspace with its members. */
  getWorkspaceWithMembers(
    id: string,
  ): Promise<(WorkspaceRow & { members: WorkspaceMemberRow[] }) | null>
  /** Get multiple workspaces with their members. */
  getWorkspacesWithMembers(
    ids: string[],
  ): Promise<Array<WorkspaceRow & { members: WorkspaceMemberRow[] }>>
  /** Update workspace fields. */
  updateWorkspace(id: string, params: Record<string, any>): Promise<WorkspaceRow>
  /** Soft-delete a workspace via RPC. */
  softDeleteWorkspace(id: string): Promise<void>
  /** Get all members of a workspace. */
  getMembersByWorkspace(workspaceId: string): Promise<WorkspaceMemberRow[]>
  /** Get a single member by workspace and user ID. */
  getMember(workspaceId: string, userId: string): Promise<WorkspaceMemberRow | null>
  /** Get a member's role. */
  getMemberRole(workspaceId: string, userId: string): Promise<string | null>
  /** Get all workspace IDs a user is a member of. */
  getMembershipWorkspaceIds(userId: string): Promise<string[]>
  /** Insert a new workspace member. */
  insertMember(params: {
    workspace_id: string
    user_id: string
    role: string
    invited_by: string | null
  }): Promise<WorkspaceMemberRow>
  /** Delete a workspace member. */
  deleteMember(workspaceId: string, userId: string): Promise<void>
  /** Get workspaces by team ID. */
  getWorkspacesByTeamId(teamId: string): Promise<WorkspaceRow[]>
  /** Update a member's role. */
  updateMemberRole(workspaceId: string, userId: string, role: string): Promise<WorkspaceMemberRow>
}
