import { useEffect, useState } from 'react'

import { useWorkspace } from '@/hooks/core/use-workspace'
import { api } from '@/lib/api-client'

export interface SQLiteTableSchema {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
    defaultValue?: string
  }>
  rowCount: number
}

export interface SQLiteDatabaseDescriptor {
  name: string
  path: string
  size: number
  modifiedAt: string
  schema: {
    tables: SQLiteTableSchema[]
    generatedAt: string
  }
  description?: string
}

interface ListDatabasesResponse {
  success: boolean
  databases: SQLiteDatabaseDescriptor[]
  count: number
}

export function useSQLiteDatabases(workspaceId?: string) {
  const { selectedWorkspace } = useWorkspace()
  const effectiveWorkspaceId = workspaceId || selectedWorkspace?.id
  const [databases, setDatabases] = useState<SQLiteDatabaseDescriptor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDatabases() {
      if (!effectiveWorkspaceId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Use the new API endpoint to list databases with schema
        const response = await api.get<ListDatabasesResponse>(
          '/api/sqlite/list-databases',
          {
            headers: {
              'x-workspace-id': effectiveWorkspaceId,
            },
          },
        )

        if (response.success) {
          setDatabases(response.databases || [])
        } else {
          setError('Failed to load databases')
        }
      } catch (err: any) {
        console.error('Failed to load SQLite databases:', err)
        setError(err?.message || 'Failed to load databases')
      } finally {
        setLoading(false)
      }
    }

    loadDatabases()
  }, [effectiveWorkspaceId])

  const refreshDatabases = async () => {
    if (!effectiveWorkspaceId) return

    try {
      const response = await api.get<ListDatabasesResponse>(
        '/api/sqlite/list-databases',
        {
          headers: {
            'x-workspace-id': effectiveWorkspaceId,
          },
        },
      )

      if (response.success) {
        setDatabases(response.databases || [])
      }
    } catch (err) {
      console.error('Failed to refresh databases:', err)
    }
  }

  return {
    databases,
    loading,
    error,
    refreshDatabases,
  }
}
