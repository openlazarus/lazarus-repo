'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDisconnectWhatsapp = (workspaceId: string, agentId: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/whatsapp`,
    params: { workspaceId },
  })
