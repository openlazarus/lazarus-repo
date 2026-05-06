'use client'

import { useEffect } from 'react'

import { useGetWorkspaceAgents } from '@/hooks/features/agents/use-get-workspace-agents'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

interface WorkspaceAgentsFetcherProps {
  wsId: string
  onAgents: (wsId: string, agents: ClaudeCodeAgent[]) => void
}

export function WorkspaceAgentsFetcher({
  wsId,
  onAgents,
}: WorkspaceAgentsFetcherProps) {
  const { data } = useGetWorkspaceAgents(wsId, { includeSystem: 'true' })
  useEffect(() => {
    if (data?.agents) {
      onAgents(
        wsId,
        data.agents.map((a) => ({
          ...a,
          workspaceId: wsId,
        })) as unknown as ClaudeCodeAgent[],
      )
    }
  }, [data, wsId, onAgents])
  return null
}
