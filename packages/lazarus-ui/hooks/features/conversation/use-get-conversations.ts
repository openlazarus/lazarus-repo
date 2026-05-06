'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type { ConversationMetadata } from '@/model/conversation'

export const useGetConversations = (workspaceId?: string) =>
  useAuthGetWorkspaceApi<{ conversations: ConversationMetadata[] }>({
    path: '/api/conversations',
    params: workspaceId ? { workspaceId } : {},
    enabled: !!workspaceId,
  })
