'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useGetConversationMessages = (
  workspaceId: string,
  conversationId: string,
) =>
  useAuthGetWorkspaceApi<{ messages: any[] }>({
    path: `/api/conversations/${conversationId}/messages`,
    params: { workspaceId },
    enabled: !!workspaceId && !!conversationId,
  })
