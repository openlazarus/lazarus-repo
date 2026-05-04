import { useCallback, useEffect, useState } from 'react'

import { useAddWorkspaceMember } from '@/hooks/features/workspace/members/use-add-workspace-member'
import { useGetWorkspaceMembers } from '@/hooks/features/workspace/members/use-get-workspace-members'
import { useRemoveWorkspaceMember } from '@/hooks/features/workspace/members/use-remove-workspace-member'
import { useUpdateWorkspaceMemberRole } from '@/hooks/features/workspace/members/use-update-workspace-member-role'
import { ServerMember, ServerMemberRole } from '@/model/workspace-member'
import { createClient } from '@/utils/supabase/client'

type PendingRoleChange = { memberId: string; role: ServerMemberRole }
type PendingRemoval = { memberId: string }

export const useWorkspaceMembers = (workspaceId?: string) => {
  const supabase = createClient()
  const wsId = workspaceId ?? ''

  const [members, setMembers] = useState<ServerMember[]>([])
  const { data, loading, error, mutate: refetch } = useGetWorkspaceMembers(wsId)

  useEffect(() => {
    setMembers(data?.members ?? [])
  }, [data])

  const [addMemberCall] = useAddWorkspaceMember(wsId)

  const [pendingRoleChange, setPendingRoleChange] =
    useState<PendingRoleChange | null>(null)
  const [updateRoleCall] = useUpdateWorkspaceMemberRole(
    wsId,
    pendingRoleChange?.memberId ?? '',
  )

  useEffect(() => {
    if (!pendingRoleChange) return
    updateRoleCall({ role: pendingRoleChange.role } as never)
      .then(() => refetch())
      .catch((err) => console.error('Error updating member role:', err))
      .finally(() => setPendingRoleChange(null))
  }, [pendingRoleChange, updateRoleCall, refetch])

  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null,
  )
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
    async (email: string, role: ServerMemberRole = ServerMemberRole.Member) => {
      if (!wsId) throw new Error('No workspace selected')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
      if (!profile) throw new Error('User not found')

      await addMemberCall({ userId: profile.id, role })
      await refetch()
      return { success: true, userId: profile.id }
    },
    [supabase, wsId, addMemberCall, refetch],
  )

  const removeMember = useCallback(
    (userId: string) => {
      if (!wsId) throw new Error('No workspace selected')
      setPendingRemoval({ memberId: userId })
    },
    [wsId],
  )

  const updateRole = useCallback(
    (userId: string, role: ServerMemberRole) => {
      if (!wsId) throw new Error('No workspace selected')
      setPendingRoleChange({ memberId: userId, role })
    },
    [wsId],
  )

  return {
    members,
    loading,
    error,
    refetch,
    addMember,
    removeMember,
    updateRole,
  }
}
