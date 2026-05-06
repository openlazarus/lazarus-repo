'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TTemplateDatabasePayload {
  name: string
  description?: string
  tables: unknown[]
}

export const useCreateTemplateDatabase = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, TTemplateDatabasePayload>({
    path: '/api/workspaces/template-database',
    params: { workspaceId },
  })
