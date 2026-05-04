'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type TAskUserResponseBody = {
  sessionId: string
  requestId: string
  answers: Record<string, string>
}

export const useSendAskUserResponse = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, TAskUserResponseBody>({
    path: '/api/chat/ask-user-response',
    params: { workspaceId },
  })
