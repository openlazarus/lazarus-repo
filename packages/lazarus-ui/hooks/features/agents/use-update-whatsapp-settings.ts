'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUpdateWhatsappSettings = (
  workspaceId: string,
  agentId: string,
) =>
  useAuthPutWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/whatsapp/settings`,
    params: { workspaceId },
  })
