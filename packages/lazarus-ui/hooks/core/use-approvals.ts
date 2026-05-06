'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useGetApprovals } from '@/hooks/features/approvals/use-get-approvals'
import { useGetApprovalsCount } from '@/hooks/features/approvals/use-get-approvals-count'
import { useResolveApproval } from '@/hooks/features/approvals/use-resolve-approval'

import { MessageHandler } from '../sockets/use-websocket'
import { useWorkspaceSocket } from '../use-workspace-socket'
import { useWorkspace } from './use-workspace'

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
  activity_trace: ActivityTraceEntry[] | null
  status: 'pending' | 'approved' | 'denied' | 'expired'
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityTraceEntry {
  type: string
  content?: unknown
  toolName?: string
  timestamp?: string
}

export function useApprovals() {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id ?? ''

  const {
    data: listData,
    loading: listLoading,
    mutate: refetchList,
  } = useGetApprovals(workspaceId)

  const { mutate: refetchCountData } = useGetApprovalsCount(workspaceId)

  // Local mirror so we can do optimistic updates on resolve.
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setApprovals(listData?.approvals ?? [])
    setPendingCount(listData?.count ?? 0)
  }, [listData])

  // Resolve mutation — pendingResolve drives the hook params.
  const [pendingResolve, setPendingResolve] = useState<{
    approvalId: string
    approved: boolean
  } | null>(null)

  const [resolveCall] = useResolveApproval(
    workspaceId,
    pendingResolve?.approvalId ?? '',
  )

  useEffect(() => {
    if (!pendingResolve) return
    const { approvalId, approved } = pendingResolve
    resolveCall({ approved })
      .then(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId))
        setPendingCount((prev) => Math.max(0, prev - 1))
      })
      .catch((err) => {
        console.error('[useApprovals] Failed to resolve approval:', err)
        refetchList()
      })
      .finally(() => setPendingResolve(null))
  }, [pendingResolve, resolveCall, refetchList])

  const resolveApproval = useCallback(
    (approvalId: string, approved: boolean) => {
      if (!workspaceId) return
      setPendingResolve({ approvalId, approved })
    },
    [workspaceId],
  )

  // WebSocket handlers — refetch on real-time updates.
  const messageHandlers: Record<string, MessageHandler> = useMemo(
    () => ({
      'approval:requested': () => {
        refetchList()
      },
      'approval:resolved': () => {
        refetchList()
      },
    }),
    [refetchList],
  )

  useWorkspaceSocket({
    workspaceId,
    messageHandlers,
    autoConnect: !!workspaceId,
  })

  return {
    approvals,
    pendingCount,
    isLoading: listLoading,
    resolveApproval,
    refetch: refetchList,
    refetchCount: refetchCountData,
  }
}
