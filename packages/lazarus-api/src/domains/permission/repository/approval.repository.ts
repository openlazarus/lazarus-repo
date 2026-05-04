/**
 * Approval Repository
 *
 * Data access for the pending_approvals table.
 * Background agents create persistent approval requests that wait indefinitely
 * for user resolution via the web dashboard.
 */

import { supabase } from '@infrastructure/database/supabase'
import type { Json } from '@infrastructure/database/database.types'
import type { IApprovalRepository } from './approval.repository.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('approval')

export interface PendingApproval {
  id: string
  workspace_id: string
  agent_id: string
  agent_name: string
  execution_id: string
  tool_name: string
  tool_input: Record<string, unknown>
  description: string
  risk_level: string
  activity_trace: unknown[] | null
  status: 'pending' | 'approved' | 'denied' | 'expired'
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateApprovalParams {
  id: string
  workspaceId: string
  agentId: string
  agentName: string
  executionId: string
  toolName: string
  toolInput: Record<string, unknown>
  description: string
  riskLevel: string
  activityTrace: unknown[] | null
}

class ApprovalRepository implements IApprovalRepository {
  async createApproval(params: CreateApprovalParams): Promise<PendingApproval> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .insert({
        id: params.id,
        workspace_id: params.workspaceId,
        agent_id: params.agentId,
        agent_name: params.agentName,
        execution_id: params.executionId,
        tool_name: params.toolName,
        tool_input: params.toolInput as unknown as Json,
        description: params.description,
        risk_level: params.riskLevel,
        activity_trace: params.activityTrace as unknown as Json,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create approval: ${error.message}`)
    }

    return data as unknown as PendingApproval
  }

  async resolveApproval(
    approvalId: string,
    approved: boolean,
    resolvedBy: string,
  ): Promise<PendingApproval> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .update({
        status: approved ? 'approved' : 'denied',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to resolve approval ${approvalId}: ${error.message}`)
    }

    return data as unknown as PendingApproval
  }

  async getPendingByWorkspace(workspaceId: string): Promise<PendingApproval[]> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get pending approvals: ${error.message}`)
    }

    return (data || []) as unknown as PendingApproval[]
  }

  async getPendingCount(workspaceId: string): Promise<number> {
    const { count, error } = await supabase
      .from('pending_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')

    if (error) {
      throw new Error(`Failed to count pending approvals: ${error.message}`)
    }

    return count || 0
  }

  async getApproval(approvalId: string): Promise<PendingApproval | null> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select('*')
      .eq('id', approvalId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get approval: ${error.message}`)
    }

    return data as unknown as PendingApproval
  }

  async expireByExecution(executionId: string): Promise<number> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('execution_id', executionId)
      .eq('status', 'pending')
      .select('id')

    if (error) {
      log.error(`Failed to expire approvals for execution ${executionId}: ${error.message}`)
      return 0
    }

    return data?.length || 0
  }

  async expireAllPending(): Promise<number> {
    const { data, error } = await supabase
      .from('pending_approvals')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .select('id')

    if (error) {
      log.error(`Failed to expire all pending approvals: ${error.message}`)
      return 0
    }

    return data?.length || 0
  }
}

export const approvalRepository: IApprovalRepository = new ApprovalRepository()
