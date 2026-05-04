'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type TChatQueryResponse = {
  events: any[]
  summary: string
  toolsUsed: string[]
  timestamp: string
}

export const useSendChatMessage = (workspaceId: string) =>
  useAuthPostWorkspaceApi<TChatQueryResponse>({
    path: '/api/chat/query',
    params: { workspaceId },
  })
