/**
 * Invitation Repository
 *
 * Encapsulates all database access for invitations, profiles,
 * and workspace member checks used by the invitation flow.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { IInvitationRepository } from './invitation.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('invitation')

export interface InvitationRow {
  id: string
  email: string
  workspace_id: string | null
  role: string
  invited_by: string
  status: string
  token: string
  expires_at: string
  created_at: string
  updated_at: string
}

class SupabaseInvitationRepository implements IInvitationRepository {
  async findProfileByEmail(email: string): Promise<{ id: string } | null> {
    const { data } = await supabase.from('profiles').select('id').eq('email', email).single()

    return data
  }

  async findWorkspaceMember(workspaceId: string, userId: string): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    return data
  }

  async findPendingInvitation(email: string, workspaceId: string): Promise<{ id: string } | null> {
    const { data } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .single()

    return data
  }

  async insertInvitation(params: {
    email: string
    workspace_id: string
    role: string
    invited_by: string
    status: string
    token: string
    expires_at: string
  }): Promise<InvitationRow> {
    const { data, error } = await supabase.from('invitations').insert(params).select().single()

    if (error || !data) {
      throw new Error(`Failed to create invitation: ${error?.message}`)
    }

    return data as unknown as InvitationRow
  }

  async findInvitationByToken(token: string): Promise<InvitationRow | null> {
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    return data ? (data as unknown as InvitationRow) : null
  }

  async updateInvitationStatus(invitationId: string, status: string): Promise<void> {
    await supabase
      .from('invitations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', invitationId)
  }

  async insertWorkspaceMember(params: {
    workspace_id: string
    user_id: string
    role: string
    invited_by: string
  }): Promise<{ error: any | null }> {
    const { error } = await supabase.from('workspace_members').insert(params)

    return { error }
  }

  async listPendingInvitations(workspaceId: string): Promise<InvitationRow[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to list invitations: ${error.message}`)
    }

    return (data || []) as unknown as InvitationRow[]
  }

  async findInvitationById(invitationId: string): Promise<{ workspace_id: string | null } | null> {
    const { data } = await supabase
      .from('invitations')
      .select('workspace_id')
      .eq('id', invitationId)
      .single()

    return data
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase.from('invitations').delete().eq('id', invitationId)

    if (error) {
      throw new Error(`Failed to cancel invitation: ${error.message}`)
    }
  }

  async getProfileById(
    userId: string,
  ): Promise<{ first_name: string | null; last_name: string | null; email: string } | null> {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single()

    return data
  }

  async getProfileEmailById(userId: string): Promise<{ email: string } | null> {
    const { data } = await supabase.from('profiles').select('email').eq('id', userId).single()

    return data
  }

  async expireOldInvitations(): Promise<number> {
    const { data, error } = await supabase
      .from('invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      log.error({ err: error }, 'Error expiring invitations')
      return 0
    }

    return data?.length || 0
  }
}

export const invitationRepository: IInvitationRepository = new SupabaseInvitationRepository()
