'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export type SQLiteQueryResult = {
  results?: any[]
  rows?: any[]
  count: number
  error?: string
}

export function useSQLiteQuery(workspaceId: string) {
  const [executeQueryPost, { loading, error, data }] =
    useAuthPostWorkspaceApi<SQLiteQueryResult>({
      path: '/api/sqlite/query',
      params: { workspaceId },
    })

  const [executeUpdatePost, { loading: updateLoading }] =
    useAuthPostWorkspaceApi<any>({
      path: '/api/sqlite/execute',
      params: { workspaceId },
    })

  const executeQuery = (dbPath: string, query: string, limit = 100) =>
    executeQueryPost({ dbPath, query, limit })

  const executeUpdate = (dbPath: string, sql: string) =>
    executeUpdatePost({ dbPath, sql })

  return {
    executeQuery,
    executeUpdate,
    loading: loading || updateLoading,
    error,
    result: data ?? null,
  }
}
