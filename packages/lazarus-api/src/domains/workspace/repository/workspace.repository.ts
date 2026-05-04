/**
 * Workspace Repository
 *
 * Encapsulates all database access for workspaces and workspace members.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { Json } from '@infrastructure/database/database.types'
import type { IWorkspaceRepository } from './workspace.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('workspace')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceRow {
  id: string
  name: string
  slug: string | null
  description: string | null
  owner_id: string
  user_id: string
  is_default: boolean | null
  settings: Json | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  avatar: string | null
  color: string | null
  needs_onboarding: boolean
  upload_email: string | null
}

export interface InsertWorkspaceParams {
  id?: string
  name: string
  description?: string | null
  user_id: string
  owner_id: string
  is_default?: boolean
  settings?: Record<string, any>
  slug?: string
}

export interface UpdateWorkspaceParams {
  name?: string
  description?: string | null
  settings?: Record<string, any>
  updated_at?: string
  slug?: string
}

export interface InsertWorkspaceMemberParams {
  workspace_id: string
  user_id: string
  role: string
}

export interface WorkspaceMemberRow {
  id: string
  workspace_id: string
  user_id: string
  role: string
  invited_by: string | null
  joined_at: string | null
  created_at: string | null
  updated_at?: string | null
}

export interface ProfileRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar: string | null
}

export interface InsertFullWorkspaceMemberParams {
  workspace_id: string
  user_id: string
  role: string
  invited_by: string
  joined_at: string
}

export interface InsertWorkspaceInvitationParams {
  workspace_id: string
  email: string
  role: string
  invited_by: string
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class WorkspaceRepository implements IWorkspaceRepository {
  async getWorkspacesByOwnerId(ownerId: string): Promise<WorkspaceRow[]> {
    const { data, error } = await supabase.from('workspaces').select('*').eq('owner_id', ownerId)

    if (error) {
      log.error({ err: error }, 'Error getting owned workspaces')
      throw error
    }

    return (data ?? []) as unknown as WorkspaceRow[]
  }

  async getMemberWorkspaceIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)

    if (error) {
      log.error({ err: error }, 'Error getting workspace memberships')
      throw error
    }

    return (data ?? []).map((m) => m.workspace_id)
  }

  async getWorkspacesByIds(ids: string[]): Promise<WorkspaceRow[]> {
    if (ids.length === 0) return []

    const { data, error } = await supabase.from('workspaces').select('*').in('id', ids)

    if (error) {
      log.error({ err: error }, 'Error getting workspaces by ids')
      throw error
    }

    return (data ?? []) as unknown as WorkspaceRow[]
  }

  async getWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (error) {
      log.error({ err: error }, 'Error getting workspace')
      return null
    }

    return (data as unknown as WorkspaceRow) ?? null
  }

  /** Alias kept for callers that prefer a nullable lookup without logging. */
  async findWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle()

    if (error) {
      log.error({ err: error }, 'Error finding workspace')
      return null
    }

    return (data as unknown as WorkspaceRow) ?? null
  }

  async getWorkspaceMembership(
    workspaceId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error checking membership')
      }
      return null
    }

    return data
  }

  async insertWorkspace(params: InsertWorkspaceParams): Promise<WorkspaceRow> {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        id: params.id,
        name: params.name,
        description: params.description ?? null,
        user_id: params.user_id,
        owner_id: params.owner_id,
        is_default: params.is_default ?? false,
        settings: (params.settings ?? {}) as unknown as Json,
        slug: params.slug,
      })
      .select()
      .single()

    if (error) {
      log.error({ err: error }, 'Error inserting workspace')
      throw error
    }

    return data as unknown as WorkspaceRow
  }

  async updateWorkspace(workspaceId: string, params: UpdateWorkspaceParams): Promise<void> {
    const updatePayload: Record<string, any> = {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.settings !== undefined && { settings: params.settings as unknown as Json }),
      ...(params.updated_at !== undefined && { updated_at: params.updated_at }),
      ...(params.slug !== undefined && { slug: params.slug }),
    }

    const { error } = await supabase.from('workspaces').update(updatePayload).eq('id', workspaceId)

    if (error) {
      log.error({ err: error }, 'Error updating workspace')
      throw error
    }
  }

  async deleteWorkspaceById(workspaceId: string): Promise<void> {
    const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId)

    if (error) {
      log.error({ err: error }, 'Error deleting workspace')
      throw error
    }
  }

  async insertWorkspaceMember(params: InsertWorkspaceMemberParams): Promise<void> {
    const { error } = await supabase.from('workspace_members').insert({
      workspace_id: params.workspace_id,
      user_id: params.user_id,
      role: params.role,
    })

    if (error) {
      log.error({ err: error }, 'Error inserting workspace member')
      throw error
    }
  }

  async transferWorkspaceOwnershipRpc(workspaceId: string, newOwnerId: string): Promise<void> {
    const { error } = await supabase.rpc('transfer_workspace_ownership', {
      p_workspace_id: workspaceId,
      p_new_owner_id: newOwnerId,
    })

    if (error) {
      log.error({ err: error }, 'Error transferring ownership')
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // Targeted lookups (thin selects for callers that don't need the full row)
  // ---------------------------------------------------------------------------

  async getWorkspaceOwnerIds(
    workspaceId: string,
  ): Promise<{ user_id: string; owner_id: string } | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('user_id, owner_id')
      .eq('id', workspaceId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace owner ids')
      }
      return null
    }

    return data
  }

  async getWorkspaceWithOwnerAndSettings(
    workspaceId: string,
  ): Promise<{ id: string; user_id: string; owner_id: string; settings: Json | null } | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, user_id, owner_id, settings')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace with settings')
      }
      return null
    }

    return data
  }

  async getWorkspaceDetails(workspaceId: string): Promise<{
    id: string
    name: string
    user_id: string
    slug: string | null
    settings: Json | null
  } | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, user_id, slug, settings')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace details')
      }
      return null
    }

    return data
  }

  async getWorkspaceName(workspaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace name')
      }
      return null
    }

    return data?.name ?? null
  }

  async getWorkspaceSettings(workspaceId: string): Promise<Json | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace settings')
      }
      return null
    }

    return data?.settings ?? null
  }

  async getWorkspaceSlug(workspaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      log.error({ err: error }, 'Error getting workspace slug')
      return null
    }

    return data?.slug ?? null
  }

  async checkSlugExists(slug: string, excludeWorkspaceId?: string): Promise<boolean> {
    let query = supabase
      .from('workspaces')
      .select('id, slug')
      .eq('slug', slug)
      .is('deleted_at', null)

    if (excludeWorkspaceId) {
      query = query.neq('id', excludeWorkspaceId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      log.error({ err: error }, 'Error checking slug')
      throw error
    }

    return data !== null
  }

  async getWorkspaceOwnerId(workspaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace owner')
      }
      return null
    }

    return data?.owner_id ?? null
  }

  async getWorkspaceBySlug(slug: string): Promise<{
    id: string
    name: string
    user_id: string
    slug: string | null
    settings: Json | null
  } | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, user_id, slug, settings')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting workspace by slug')
      }
      return null
    }

    return data
  }

  async healthCheck(): Promise<boolean> {
    const { error } = await supabase.from('workspaces').select('id').limit(1)

    return !error
  }

  async getActiveWorkspaces(): Promise<
    Array<{ id: string; user_id: string; owner_id: string; name: string }>
  > {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, user_id, owner_id, name')
      .is('deleted_at', null)

    if (error) {
      log.error({ err: error }, 'Error loading active workspaces')
      throw error
    }

    return data ?? []
  }

  async getActiveWorkspaceIds(): Promise<string[]> {
    const { data, error } = await supabase.from('workspaces').select('id').is('deleted_at', null)

    if (error) {
      log.error({ err: error }, 'Error loading active workspace IDs')
      return []
    }

    return (data ?? []).map((w) => w.id)
  }

  // ---------------------------------------------------------------------------
  // Workspace member role lookups (for auth middleware)
  // ---------------------------------------------------------------------------

  async getWorkspaceMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting member role')
      }
      return null
    }

    return data?.role ?? null
  }

  async getWorkspaceMembersByWorkspace(
    workspaceId: string,
  ): Promise<Array<{ user_id: string; role: string }>> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)

    if (error) {
      log.error({ err: error }, 'Error getting workspace members')
      return []
    }

    return data ?? []
  }

  // ---------------------------------------------------------------------------
  // Profile lookups (used by workspace member email resolution)
  // ---------------------------------------------------------------------------

  async getProfileEmail(userId: string): Promise<{ id: string; email: string } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        log.error({ err: error }, 'Error getting profile email')
      }
      return null
    }

    return data
  }

  async getProfileEmails(userIds: string[]): Promise<Array<{ id: string; email: string }>> {
    if (userIds.length === 0) return []

    const { data, error } = await supabase.from('profiles').select('id, email').in('id', userIds)

    if (error) {
      log.error({ err: error }, 'Error getting profile emails')
      return []
    }

    return data ?? []
  }

  // ---------------------------------------------------------------------------
  // Kapso customer lookups (WhatsApp integration)
  // ---------------------------------------------------------------------------

  async getKapsoCustomerId(workspaceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('kapso_customers')
      .select('kapso_customer_id')
      .eq('workspace_id', workspaceId)
      .single()

    if (error && error.code !== 'PGRST116') {
      log.error({ err: error }, 'Error getting Kapso customer')
    }

    return data?.kapso_customer_id ?? null
  }

  async insertKapsoCustomer(workspaceId: string, kapsoCustomerId: string): Promise<boolean> {
    const { error } = await supabase.from('kapso_customers').insert({
      workspace_id: workspaceId,
      kapso_customer_id: kapsoCustomerId,
    })

    if (error) {
      log.error({ err: error }, 'Error inserting Kapso customer')
      return false
    }

    return true
  }

  // ---------------------------------------------------------------------------
  // Full member operations (for workspace routes)
  // ---------------------------------------------------------------------------

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, invited_by, joined_at, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch workspace members: ${error.message}`)
    }

    return (data ?? []) as unknown as WorkspaceMemberRow[]
  }

  async addWorkspaceMemberFull(
    params: InsertFullWorkspaceMemberParams,
  ): Promise<WorkspaceMemberRow> {
    const { data, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: params.workspace_id,
        user_id: params.user_id,
        role: params.role,
        invited_by: params.invited_by,
        joined_at: params.joined_at,
      })
      .select('id, workspace_id, user_id, role, invited_by, joined_at, created_at')
      .single()

    if (error) {
      throw new Error(`Failed to add workspace member: ${error.message}`)
    }

    return data as unknown as WorkspaceMemberRow
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to remove workspace member: ${error.message}`)
    }
  }

  async updateWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    role: string,
  ): Promise<WorkspaceMemberRow> {
    const { data, error } = await supabase
      .from('workspace_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select('id, workspace_id, user_id, role, invited_by, joined_at, created_at, updated_at')
      .single()

    if (error) {
      throw new Error(`Failed to update workspace member role: ${error.message}`)
    }

    return data as unknown as WorkspaceMemberRow
  }

  // ---------------------------------------------------------------------------
  // Full profile lookups (for workspace member management)
  // ---------------------------------------------------------------------------

  async getProfilesByIds(userIds: string[]): Promise<ProfileRow[]> {
    if (userIds.length === 0) return []

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, avatar')
      .in('id', userIds)

    if (error) {
      log.error({ err: error }, 'Error fetching profiles')
      return []
    }

    return (data ?? []) as unknown as ProfileRow[]
  }

  async getProfileByEmail(email: string): Promise<{ id: string } | null> {
    const { data } = await supabase.from('profiles').select('id').eq('email', email).single()

    return data
  }

  async getProfileById(userId: string): Promise<ProfileRow | null> {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, avatar')
      .eq('id', userId)
      .single()

    return (data as unknown as ProfileRow) ?? null
  }

  // ---------------------------------------------------------------------------
  // Workspace invitations (workspace_invitations table)
  // ---------------------------------------------------------------------------

  async insertWorkspaceInvitation(
    params: InsertWorkspaceInvitationParams,
  ): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: params.workspace_id,
        email: params.email,
        role: params.role,
        invited_by: params.invited_by,
      })
      .select()
      .single()

    if (error) {
      const err: any = new Error(`Failed to create invitation: ${error.message}`)
      err.code = error.code
      throw err
    }

    return data as Record<string, any>
  }

  async getPendingWorkspaceInvitations(workspaceId: string): Promise<Record<string, any>[]> {
    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .is('declined_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch invitations: ${error.message}`)
    }

    return (data ?? []) as Record<string, any>[]
  }

  async deleteWorkspaceInvitation(invitationId: string, workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('workspace_id', workspaceId)

    if (error) {
      throw new Error(`Failed to cancel invitation: ${error.message}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Access checks (moved from infrastructure/database/supabase.ts)
  // ---------------------------------------------------------------------------

  async isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()
    if (ws?.owner_id === userId) return true

    const { data, error } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') return false
    return !!data
  }

  async isWorkspaceAdmin(userId: string, workspaceId: string): Promise<boolean> {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single()
    if (ws?.owner_id === userId) return true

    const { data, error } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') return false
    return data?.role === 'owner' || data?.role === 'admin'
  }

  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) return false
    return !!data
  }
}

export const workspaceRepository: IWorkspaceRepository = new WorkspaceRepository()
