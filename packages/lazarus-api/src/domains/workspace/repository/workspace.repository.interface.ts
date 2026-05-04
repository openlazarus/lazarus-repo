import type { Json } from '@infrastructure/database/database.types'
import type {
  WorkspaceRow,
  InsertWorkspaceParams,
  UpdateWorkspaceParams,
  InsertWorkspaceMemberParams,
  WorkspaceMemberRow,
  ProfileRow,
  InsertFullWorkspaceMemberParams,
  InsertWorkspaceInvitationParams,
} from './workspace.repository'

export interface IWorkspaceRepository {
  /** Get all workspaces owned by a user. */
  getWorkspacesByOwnerId(ownerId: string): Promise<WorkspaceRow[]>
  /** Get workspace IDs a user is a member of. */
  getMemberWorkspaceIds(userId: string): Promise<string[]>
  /** Get workspaces by a list of IDs. */
  getWorkspacesByIds(ids: string[]): Promise<WorkspaceRow[]>
  /** Get a workspace by ID (logs on error). */
  getWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null>
  /** Find a workspace by ID (nullable, quiet). */
  findWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null>
  /** Check if a user is a member of a workspace. */
  getWorkspaceMembership(workspaceId: string, userId: string): Promise<{ id: string } | null>
  /** Insert a new workspace. */
  insertWorkspace(params: InsertWorkspaceParams): Promise<WorkspaceRow>
  /** Update workspace fields. */
  updateWorkspace(workspaceId: string, params: UpdateWorkspaceParams): Promise<void>
  /** Hard-delete a workspace by ID. */
  deleteWorkspaceById(workspaceId: string): Promise<void>
  /** Insert a workspace member. */
  insertWorkspaceMember(params: InsertWorkspaceMemberParams): Promise<void>
  /** Transfer workspace ownership via RPC. */
  transferWorkspaceOwnershipRpc(workspaceId: string, newOwnerId: string): Promise<void>

  /** Get user_id and owner_id for a workspace. */
  getWorkspaceOwnerIds(workspaceId: string): Promise<{ user_id: string; owner_id: string } | null>
  /** Get workspace with owner and settings fields. */
  getWorkspaceWithOwnerAndSettings(
    workspaceId: string,
  ): Promise<{ id: string; user_id: string; owner_id: string; settings: Json | null } | null>
  /** Get workspace details (id, name, user_id, slug, settings). */
  getWorkspaceDetails(workspaceId: string): Promise<{
    id: string
    name: string
    user_id: string
    slug: string | null
    settings: Json | null
  } | null>
  /** Get just the workspace name. */
  getWorkspaceName(workspaceId: string): Promise<string | null>
  /** Get workspace settings JSON. */
  getWorkspaceSettings(workspaceId: string): Promise<Json | null>
  /** Get the workspace slug. */
  getWorkspaceSlug(workspaceId: string): Promise<string | null>
  /** Check if a slug exists, optionally excluding a workspace. */
  checkSlugExists(slug: string, excludeWorkspaceId?: string): Promise<boolean>
  /** Get the owner ID of a workspace. */
  getWorkspaceOwnerId(workspaceId: string): Promise<string | null>
  /** Get a workspace by its slug. */
  getWorkspaceBySlug(slug: string): Promise<{
    id: string
    name: string
    user_id: string
    slug: string | null
    settings: Json | null
  } | null>
  /** Check database connectivity. */
  healthCheck(): Promise<boolean>
  /** Get all active (non-deleted) workspaces. */
  getActiveWorkspaces(): Promise<
    Array<{ id: string; user_id: string; owner_id: string; name: string }>
  >
  /** Get IDs of all active workspaces. */
  getActiveWorkspaceIds(): Promise<string[]>

  /** Get a member's role in a workspace. */
  getWorkspaceMemberRole(workspaceId: string, userId: string): Promise<string | null>
  /** Get all members (user_id + role) for a workspace. */
  getWorkspaceMembersByWorkspace(
    workspaceId: string,
  ): Promise<Array<{ user_id: string; role: string }>>

  /** Get a single profile's email. */
  getProfileEmail(userId: string): Promise<{ id: string; email: string } | null>
  /** Get emails for multiple user IDs. */
  getProfileEmails(userIds: string[]): Promise<Array<{ id: string; email: string }>>

  /** Get the Kapso customer ID for a workspace. */
  getKapsoCustomerId(workspaceId: string): Promise<string | null>
  /** Insert a Kapso customer mapping. */
  insertKapsoCustomer(workspaceId: string, kapsoCustomerId: string): Promise<boolean>

  /** Get workspace members (full rows). */
  getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRow[]>
  /** Add a workspace member with all fields. */
  addWorkspaceMemberFull(params: InsertFullWorkspaceMemberParams): Promise<WorkspaceMemberRow>
  /** Remove a workspace member. */
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>
  /** Update a workspace member's role. */
  updateWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    role: string,
  ): Promise<WorkspaceMemberRow>

  /** Get profiles by user IDs. */
  getProfilesByIds(userIds: string[]): Promise<ProfileRow[]>
  /** Find a profile by email. */
  getProfileByEmail(email: string): Promise<{ id: string } | null>
  /** Get a full profile by user ID. */
  getProfileById(userId: string): Promise<ProfileRow | null>

  /** Insert a workspace invitation. */
  insertWorkspaceInvitation(params: InsertWorkspaceInvitationParams): Promise<Record<string, any>>
  /** Get pending invitations for a workspace. */
  getPendingWorkspaceInvitations(workspaceId: string): Promise<Record<string, any>[]>
  /** Delete a workspace invitation. */
  deleteWorkspaceInvitation(invitationId: string, workspaceId: string): Promise<void>

  /** Check if a user is a member of a workspace (owner counts). */
  isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean>
  /** Check if a user is an admin of a workspace (owner counts). */
  isWorkspaceAdmin(userId: string, workspaceId: string): Promise<boolean>
  /** Check if a user has any access to a workspace. */
  hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean>
}
