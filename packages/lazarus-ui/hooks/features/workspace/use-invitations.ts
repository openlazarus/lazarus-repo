import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/utils/supabase/client'

export interface Invitation {
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
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

export const useInvitations = (workspaceId?: string) => {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchInvitations = useCallback(async () => {
    if (!workspaceId) {
      setInvitations([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
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
          profiles:invited_by (first_name, last_name, email)
        `,
        )
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null)
        .is('declined_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvitations(data || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, supabase])

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      try {
        const { error } = await supabase
          .from('workspace_invitations')
          .delete()
          .eq('id', invitationId)

        if (error) throw error
        await fetchInvitations()
      } catch (error) {
        console.error('Error canceling invitation:', error)
        throw error
      }
    },
    [supabase, fetchInvitations],
  )

  const sendInvitation = useCallback(
    async (email: string, role: string = 'editor') => {
      if (!workspaceId) throw new Error('Workspace ID is required')

      const response = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, workspaceId, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      await fetchInvitations()
      return data
    },
    [workspaceId, fetchInvitations],
  )

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return {
    invitations,
    loading,
    fetchInvitations,
    cancelInvitation,
    sendInvitation,
  }
}
