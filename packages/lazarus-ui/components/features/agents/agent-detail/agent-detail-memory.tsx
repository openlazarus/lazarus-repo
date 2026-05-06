'use client'

import { useAuth } from '@/hooks/auth/use-auth'

import { KnowledgeGraphView } from '@/app/(main)/files/components/knowledge/knowledge-graph-view'

interface AgentDetailMemoryProps {
  workspaceId: string
  agentId: string
  agentName: string
}

export function AgentDetailMemory({
  workspaceId,
  agentId,
  agentName,
}: AgentDetailMemoryProps) {
  const { session } = useAuth()
  const userId = session?.user?.id

  if (!workspaceId || !userId || !agentId) {
    return (
      <div className='p-6 text-sm opacity-60'>
        Memory requires a workspace, agent, and user context.
      </div>
    )
  }

  return (
    <div className='h-[calc(100vh-240px)] min-h-[500px]'>
      <KnowledgeGraphView
        workspaceId={workspaceId}
        userId={userId}
        agentId={agentId}
        scopeLabel={`${agentName}'s Memory`}
      />
    </div>
  )
}
