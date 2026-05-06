/**
 * Team Repository
 *
 * Data access for workspaces and workspace_members tables
 * (the DB has no separate "teams" table — workspaces serve that role).
 */

import { supabase } from '@infrastructure/database/supabase'
import type { Json } from '@infrastructure/database/database.types'
import type { ITeamRepository } from './team.repository.interface'

export interface WorkspaceRow {
  id: string
  name: string
  slug: string | null
  owner_id: string
  user_id: string
  description: string | null
  avatar: string | null
  settings: Json | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
  is_default: boolean | null
  needs_onboarding: boolean
  color: string | null
  upload_email: string | null
}

export interface WorkspaceMemberRow {
  id: string
  workspace_id: string
  user_id: string
  role: string
  invited_by: string | null
  joined_at: string | null
  created_at: string | null
  updated_at: string | null
}

class TeamRepository implements ITeamRepository {
  async slugExists(slug: string): Promise<boolean> {
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    return data !== null
  }

  async createWorkspace(params: {
    name: string
    slug: string
    owner_id: string
    description?: string | null
    avatar?: string | null
    settings?: Record<string, any>
  }): Promise<WorkspaceRow> {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: params.name,
        slug: params.slug,
        owner_id: params.owner_id,
        user_id: params.owner_id,
        description: params.description ?? null,
        avatar: params.avatar ?? null,
        settings: (params.settings ?? null) as Json,
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to create workspace: ${error?.message}`)
    }

    return data
  }

  async deleteWorkspace(id: string): Promise<void> {
    await supabase.from('workspaces').delete().eq('id', id)
  }

  async getWorkspaceWithMembers(
    id: string,
  ): Promise<(WorkspaceRow & { members: WorkspaceMemberRow[] }) | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select(`*, members:workspace_members(*)`)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch workspace: ${error.message}`)
    }

    const members = Array.isArray(data.members) ? data.members : []
    return { ...data, members } as unknown as WorkspaceRow & { members: WorkspaceMemberRow[] }
  }

  async getWorkspacesWithMembers(
    ids: string[],
  ): Promise<Array<WorkspaceRow & { members: WorkspaceMemberRow[] }>> {
    const { data, error } = await supabase
      .from('workspaces')
      .select(`*, members:workspace_members(*)`)
      .in('id', ids)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch workspaces: ${error.message}`)
    }

    return (data || []).map((ws) => {
      const members = Array.isArray(ws.members) ? ws.members : []
      return { ...ws, members } as unknown as WorkspaceRow & { members: WorkspaceMemberRow[] }
    })
  }

  async updateWorkspace(id: string, params: Record<string, any>): Promise<WorkspaceRow> {
    const { data, error } = await supabase
      .from('workspaces')
      .update({ ...params, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to update workspace: ${error?.message}`)
    }

    return data
  }

  async softDeleteWorkspace(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_workspace', { p_workspace_id: id })

    if (error) {
      throw new Error(`Failed to soft-delete workspace: ${error.message}`)
    }
  }

  async getMembersByWorkspace(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch members: ${error.message}`)
    }

    return (data || []) as WorkspaceMemberRow[]
  }

  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMemberRow | null> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch member: ${error.message}`)
    }

    return data as WorkspaceMemberRow
  }

  async getMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const { data } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    return data?.role ?? null
  }

  async getMembershipWorkspaceIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to fetch memberships: ${error.message}`)
    }

    return (data || []).map((m) => m.workspace_id)
  }

  async insertMember(params: {
    workspace_id: string
    user_id: string
    role: string
    invited_by: string | null
  }): Promise<WorkspaceMemberRow> {
    const { data, error } = await supabase
      .from('workspace_members')
      .insert(params)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to insert member: ${error?.message}`)
    }

    return data as WorkspaceMemberRow
  }

  async deleteMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete member: ${error.message}`)
    }
  }

  async getWorkspacesByTeamId(teamId: string): Promise<WorkspaceRow[]> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch team workspaces: ${error.message}`)
    }

    return (data || []) as unknown as WorkspaceRow[]
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: string,
  ): Promise<WorkspaceMemberRow> {
    const { data, error } = await supabase
      .from('workspace_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to update member role: ${error?.message}`)
    }

    return data as WorkspaceMemberRow
  }
}

export const teamRepository: ITeamRepository = new TeamRepository()
