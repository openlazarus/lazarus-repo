'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useGenerateConversationTitle = (conversationId: string) =>
  useAuthPostWorkspaceApi<{ title: string }>({
    path: `/api/conversations/${conversationId}/generate-title`,
  })
