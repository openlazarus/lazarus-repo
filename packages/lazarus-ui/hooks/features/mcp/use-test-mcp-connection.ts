'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { ConnectionTestResult } from './types'

export const useTestMcpConnection = (workspaceId: string, serverName: string) =>
  useAuthPostWorkspaceApi<ConnectionTestResult>({
    path: `/api/workspaces/mcp/servers/${serverName}/test-connection`,
    params: { workspaceId },
  })
