'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type TriggerPayload = {
  type: string
  name: string
  config: any
  enabled: boolean
}

type CreateTriggerResponse = {
  success: boolean
  trigger: { id: string; name: string; type: string }
  message: string
}

export const useCreateTrigger = (workspaceId: string, agentId: string) =>
  useAuthPostWorkspaceApi<CreateTriggerResponse, TriggerPayload>({
    path: `/api/workspaces/agents/${agentId}/triggers`,
    params: { workspaceId },
  })
