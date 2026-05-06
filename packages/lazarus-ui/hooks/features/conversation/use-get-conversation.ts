'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type { ConversationMetadata } from '@/model/conversation'

export const useGetConversation = (
  workspaceId: string,
  conversationId: string,
) =>
  useAuthGetWorkspaceApi<{ conversation: ConversationMetadata }>({
    path: `/api/conversations/${conversationId}`,
    params: { workspaceId },
    enabled: !!workspaceId && !!conversationId,
  })
