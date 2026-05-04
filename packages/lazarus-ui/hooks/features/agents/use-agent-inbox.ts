import { useCallback, useEffect, useState } from 'react'

import { api } from '@/lib/api-client'
import { AgentInbox, EmailFilter } from '@/model/agent-inbox'

interface UseAgentInboxOptions {
  agentId: string
  filter?: EmailFilter
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAgentInboxReturn {
  inbox: AgentInbox | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  markAsRead: (emailId: string) => Promise<void>
  sendReply: (emailId: string, body: string) => Promise<void>
}

export function useAgentInbox({
  agentId,
  filter,
  autoRefresh = false,
  refreshInterval = 5000,
}: UseAgentInboxOptions): UseAgentInboxReturn {
  const [inbox, setInbox] = useState<AgentInbox | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!agentId) return

    try {
      setLoading(true)
      setError(null)

      const params: Record<string, string> = {}
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params[key] = String(value)
          }
        })
      }

      const data = await api.get(`/api/agent-inbox/agents/${agentId}/inbox`, {
        params,
      })
      setInbox(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [agentId, filter])

  const markAsRead = useCallback(
    async (emailId: string) => {
      try {
        await api.patch(
          `/api/agent-inbox/agents/${agentId}/emails/${emailId}/read`,
        )
        await refresh()
      } catch (err) {
        console.error('Failed to mark email as read:', err)
      }
    },
    [agentId, refresh],
  )

  const sendReply = useCallback(
    async (emailId: string, body: string) => {
      try {
        await api.post(
          `/api/agent-inbox/agents/${agentId}/emails/${emailId}/reply`,
          {
            body,
            replyToAll: false,
          },
        )
        await refresh()
      } catch (err) {
        console.error('Failed to send reply:', err)
      }
    },
    [agentId, refresh],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!autoRefresh || !agentId) return

    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh, agentId])

  return {
    inbox,
    loading,
    error,
    refresh,
    markAsRead,
    sendReply,
  }
}
