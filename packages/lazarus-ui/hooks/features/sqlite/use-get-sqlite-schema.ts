'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

type Table = {
  name: string
  columns: Array<{
    name: string
    type: string
    notnull?: boolean
    pk?: boolean
  }>
}

type SqliteSchemaResponse = {
  success: boolean
  schema: { tables: Table[]; generatedAt: string }
}

export const useGetSqliteSchema = (workspaceId: string, database: string) =>
  useAuthGetWorkspaceApi<SqliteSchemaResponse>({
    path: '/api/sqlite/schema-info',
    params: { workspaceId, database },
    enabled: !!workspaceId && !!database,
  })
