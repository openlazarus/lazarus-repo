'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { InitiateOAuthResult } from './types'

export const useInitiateMcpOAuth = (workspaceId: string, serverName: string) =>
  useAuthPostWorkspaceApi<InitiateOAuthResult>({
    path: `/api/workspaces/mcp/servers/${serverName}/initiate-oauth`,
    params: { workspaceId },
  })
