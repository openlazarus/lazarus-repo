'use client'

import { useAuthPatchWorkspaceApi } from '@/hooks/data/use-workspace-api'

type TUpdateConversationBody = {
  title?: string
  labels?: string[]
  notes?: string
}

export const useUpdateConversation = (conversationId: string) =>
  useAuthPatchWorkspaceApi<void, TUpdateConversationBody>({
    path: `/api/conversations/${conversationId}`,
  })
