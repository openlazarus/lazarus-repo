import { useCallback, useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { useCancelWorkspaceInvitation } from '@/hooks/features/workspace/invitations/use-cancel-workspace-invitation'
import { useGetWorkspaceInvitations } from '@/hooks/features/workspace/invitations/use-get-workspace-invitations'
import { useAddWorkspaceMember } from '@/hooks/features/workspace/members/use-add-workspace-member'
import { useGetWorkspaceMembers } from '@/hooks/features/workspace/members/use-get-workspace-members'
import { useLeaveWorkspace } from '@/hooks/features/workspace/members/use-leave-workspace'
import { useRemoveWorkspaceMember } from '@/hooks/features/workspace/members/use-remove-workspace-member'
import { useUpdateWorkspaceMemberRole } from '@/hooks/features/workspace/members/use-update-workspace-member-role'
import { api } from '@/lib/api-client'
import {
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
} from '@/model/workspace'
import { createClient } from '@/utils/supabase/client'

/**
 * Workspace management hook with CRUD operations.
 *
 * - list/create/update/delete hit the orchestrator (default `api` client).
 * - transfer hits the target workspace VM via `getWorkspaceBaseUrl`.
 */
export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { mutate: globalMutate } = useSWRConfig()

  const refreshGlobalWorkspaces = useCallback(async () => {
    await globalMutate(
      (key: any) => Array.isArray(key) && key[0] === '/api/workspaces',
    )
  }, [globalMutate])

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<{ workspaces: Workspace[] }>(`/api/workspaces`)
      setWorkspaces(data.workspaces || [])
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch workspaces'),
      )
      console.error('Error fetching workspaces:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createWorkspace = useCallback(
    async (
      name: string,
      options?: {
        templateId?: string
        color?: string
        description?: string
        inviteEmails?: string[]
      },
    ) => {
      const data = await api.post<{ workspace: Workspace }>(`/api/workspaces`, {
        name,
        templateId: options?.templateId || 'default',
        description: options?.description,
        inviteEmails: options?.inviteEmails,
      })

      if (options?.color && data.workspace?.id) {
        const supabase = createClient()
        await supabase
          .from('workspaces')
          .update({ color: options.color })
          .eq('id', data.workspace.id)
      }

      await fetchWorkspaces()
      await refreshGlobalWorkspaces()
      return data.workspace
    },
    [fetchWorkspaces, refreshGlobalWorkspaces],
  )

  const updateWorkspace = useCallback(
    async (workspaceId: string, updates: Partial<Workspace>) => {
      await api.put(`/api/workspaces/${workspaceId}`, updates)
      await fetchWorkspaces()
      await refreshGlobalWorkspaces()
    },
    [fetchWorkspaces, refreshGlobalWorkspaces],
  )

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      await api.delete(`/api/workspaces/${workspaceId}`)
      await fetchWorkspaces()
      await refreshGlobalWorkspaces()
    },
    [fetchWorkspaces, refreshGlobalWorkspaces],
  )

  const transferWorkspace = useCallback(
    async (workspaceId: string, newOwnerId: string) => {
      const baseUrl = getWorkspaceBaseUrl(workspaceId)
      await api.post(`${baseUrl}/api/workspaces/transfer`, { newOwnerId })
      await fetchWorkspaces()
      await refreshGlobalWorkspaces()
    },
    [fetchWorkspaces, refreshGlobalWorkspaces],
  )

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    workspaces,
    loading,
    error,
    refetch: fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    transferWorkspace,
  }
}

type PendingMemberMutation = {
  memberId: string
  role?: string
}

/**
 * Workspace members hook — uses atomic workspace-VM hooks.
 */
export const useWorkspaceMembers = (workspaceId?: string) => {
  const wsId = workspaceId ?? ''

  const {
    data: membersData,
    loading,
    error,
    mutate: refetch,
  } = useGetWorkspaceMembers(wsId)
  const [members, setMembers] = useState<WorkspaceMember[]>([])

  useEffect(() => {
    setMembers((membersData?.members ?? []) as unknown as WorkspaceMember[])
  }, [membersData])

  const [addMemberCall] = useAddWorkspaceMember(wsId)
  const [leaveCall] = useLeaveWorkspace(wsId)

  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingMemberMutation | null>(null)
  const [updateRoleCall] = useUpdateWorkspaceMemberRole(
    wsId,
    pendingRoleChange?.memberId ?? '',
  )

  useEffect(() => {
    if (!pendingRoleChange?.role) return
    updateRoleCall({ role: pendingRoleChange.role } as never)
      .then(() => refetch())
      .catch((err) => console.error('Error updating member role:', err))
      .finally(() => setPendingRoleChange(null))
  }, [pendingRoleChange, updateRoleCall, refetch])

  const [pendingRemoval, setPendingRemoval] =
    useState<PendingMemberMutation | null>(null)
  const [removeCall] = useRemoveWorkspaceMember(
    wsId,
    pendingRemoval?.memberId ?? '',
  )

  useEffect(() => {
    if (!pendingRemoval) return
    removeCall(undefined as never)
      .then(() => refetch())
      .catch((err) => console.error('Error removing workspace member:', err))
      .finally(() => setPendingRemoval(null))
  }, [pendingRemoval, removeCall, refetch])

  const addMember = useCallback(
    async (params: { userId?: string; email?: string; role?: string }) => {
      if (!wsId) throw new Error('No workspace selected')
      await addMemberCall(params)
      await refetch()
    },
    [wsId, addMemberCall, refetch],
  )

  const updateMemberRole = useCallback(
    (userId: string, role: string) => {
      if (!wsId) throw new Error('No workspace selected')
      setPendingRoleChange({ memberId: userId, role })
    },
    [wsId],
  )

  const removeMember = useCallback(
    (userId: string) => {
      if (!wsId) throw new Error('No workspace selected')
      setPendingRemoval({ memberId: userId })
    },
    [wsId],
  )

  const leaveWorkspace = useCallback(async () => {
    if (!wsId) throw new Error('No workspace selected')
    await leaveCall(undefined as never)
  }, [wsId, leaveCall])

  return {
    members,
    loading,
    error,
    refetch,
    addMember,
    updateMemberRole,
    removeMember,
    leaveWorkspace,
  }
}

/**
 * Workspace invitations hook — uses atomic workspace-VM hooks.
 */
export const useWorkspaceInvitations = (workspaceId?: string) => {
  const wsId = workspaceId ?? ''

  const {
    data: invitationsData,
    loading,
    error,
    mutate: refetch,
  } = useGetWorkspaceInvitations(wsId)
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])

  useEffect(() => {
    setInvitations(invitationsData?.invitations ?? [])
  }, [invitationsData])

  // sendInvitation hits a Next.js API route, not a workspace endpoint.
  const sendInvitation = useCallback(
    async (email: string, role: string = 'editor') => {
      if (!wsId) throw new Error('No workspace selected')

      const response = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, workspaceId: wsId, role }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }
      await refetch()
      return data
    },
    [wsId, refetch],
  )

  const [pendingCancel, setPendingCancel] = useState<{ id: string } | null>(
    null,
  )
  const [cancelCall] = useCancelWorkspaceInvitation(
    wsId,
    pendingCancel?.id ?? '',
  )

  useEffect(() => {
    if (!pendingCancel) return
    cancelCall(undefined as never)
      .then(() => refetch())
      .catch((err) => console.error('Error canceling invitation:', err))
      .finally(() => setPendingCancel(null))
  }, [pendingCancel, cancelCall, refetch])

  const cancelInvitation = useCallback(
    (invitationId: string) => {
      if (!wsId) throw new Error('No workspace selected')
      setPendingCancel({ id: invitationId })
    },
    [wsId],
  )

  return {
    invitations,
    loading,
    error,
    refetch,
    sendInvitation,
    cancelInvitation,
  }
}
