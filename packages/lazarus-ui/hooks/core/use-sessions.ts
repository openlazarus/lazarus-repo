'use client'

import { useGetSessions } from '@/hooks/features/session/use-get-sessions'

export function useSessions(workspaceId: string) {
  const { data, loading, error, mutate } = useGetSessions(workspaceId)

  return {
    sessions: data?.sessions ?? [],
    count: data?.count ?? 0,
    isLoading: loading,
    error,
    refresh: mutate,
  }
}
