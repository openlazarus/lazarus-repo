'use client'

import { useGetWorkspaceAgents } from '@/hooks/features/agents/use-get-workspace-agents'

interface WorkspaceAgentCountProps {
  workspaceId: string
  /** Optional fallback rendered before the request resolves. */
  fallback?: number
}

export function WorkspaceAgentCount({
  workspaceId,
  fallback = 0,
}: WorkspaceAgentCountProps) {
  const { data } = useGetWorkspaceAgents(workspaceId, {
    includeSystem: 'true',
  })
  const count = data?.agents?.length ?? fallback
  return <>{count === 1 ? '1 agent' : `${count} agents`}</>
}
