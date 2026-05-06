import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { WorkspaceTemplate } from './types'

interface WorkspaceTemplatesResponse {
  success: boolean
  templates: WorkspaceTemplate[]
}

export const useWorkspaceTemplates = () => {
  const { data, loading, error, mutate } =
    useAuthGetLazarusApi<WorkspaceTemplatesResponse>({
      path: '/api/workspaces/templates',
    })

  const templates = data?.templates || []

  return {
    templates,
    loading,
    error,
    refetch: mutate,
  }
}

/**
 * Get default workspace template
 */
export const getDefaultTemplate = (
  templates: WorkspaceTemplate[],
): WorkspaceTemplate | null => {
  return templates.find((t) => t.id === 'default') || templates[0] || null
}

/**
 * Get template by ID
 */
export const getTemplateById = (
  templates: WorkspaceTemplate[],
  templateId: string,
): WorkspaceTemplate | null => {
  return templates.find((t) => t.id === templateId) || null
}
