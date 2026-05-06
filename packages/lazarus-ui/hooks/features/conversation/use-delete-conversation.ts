'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDeleteConversation = (conversationId: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/conversations/${conversationId}`,
  })
