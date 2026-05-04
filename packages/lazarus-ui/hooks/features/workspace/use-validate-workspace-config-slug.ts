'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TValidateSlugPayload {
  slug: string
}

interface TValidateSlugResponse {
  valid: boolean
  error?: string
}

export const useValidateWorkspaceConfigSlug = (workspaceId: string) =>
  useAuthPostWorkspaceApi<TValidateSlugResponse, TValidateSlugPayload>({
    path: '/api/workspaces/config/validate-slug',
    params: { workspaceId },
  })
