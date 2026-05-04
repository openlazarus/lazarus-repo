import { useCallback } from 'react'

import { useAuthSupabaseMutation } from '@/hooks/data/use-auth-supabase-mutation'
import { useAuthSupabaseQuery } from '@/hooks/data/use-auth-supabase-query'
import { useAuthStore } from '@/store/auth-store'

export interface PendingInvitation {
  id: string
  email: string
  workspace_id: string
  role: string
  invited_by: string
  code: string
  expires_at: string
  created_at: string
  accepted_at: string | null
  declined_at: string | null
  workspaces?: {
    id: string
    name: string
  }
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
    avatar: string | null
  }
}

const INVITATIONS_KEY = 'pending-invitations'

export const usePendingInvitations = () => {
  const profile = useAuthStore((s) => s.profile)
  const email = profile?.email

  // SWR-backed query — deduped, cached, auto-skips when email is missing
  const {
    data: invitations,
    error,
    loading,
    refetch,
  } = useAuthSupabaseQuery<PendingInvitation[]>(
    email ? [INVITATIONS_KEY, email] : null,
    (supabase) =>
      supabase
        .from('workspace_invitations')
        .select(
          `
            id,
            email,
            workspace_id,
            role,
            invited_by,
            code,
            expires_at,
            created_at,
            accepted_at,
            declined_at,
            workspaces (id, name),
            profiles:invited_by (first_name, last_name, email, avatar)
          `,
        )
        .eq('email', email!)
        .is('accepted_at', null)
        .is('declined_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
  )

  const acceptInvitation = useCallback(async (code: string) => {
    window.location.href = `/accept-invitation?code=${code}`
  }, [])

  const [declineMutation] = useAuthSupabaseMutation(
    async (supabase, invitationId: string) => {
      return supabase
        .from('workspace_invitations')
        .update({ declined_at: new Date().toISOString() })
        .eq('id', invitationId)
    },
    {
      invalidateKeys: email ? [[INVITATIONS_KEY, email]] : [],
    },
  )

  const declineInvitation = useCallback(
    async (invitationId: string) => {
      await declineMutation(invitationId)
    },
    [declineMutation],
  )

  return {
    invitations: invitations || [],
    loading,
    error,
    refetch,
    acceptInvitation,
    declineInvitation,
  }
}
