'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useGetWhatsappSetupLink = (workspaceId: string) =>
  useAuthPostWorkspaceApi<{ setupLink: string }>({
    path: '/api/workspaces/whatsapp/setup-link',
    params: { workspaceId },
  })
