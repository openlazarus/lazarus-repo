'use client'

import { useState } from 'react'

import { useAllMemory } from '@/hooks/features/knowledge/use-knowledge-graph'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

import { ArtifactCard } from '@/app/(main)/files/components/knowledge/artifact-card'
import { ArtifactViewer } from '@/app/(main)/files/components/knowledge/artifact-viewer'
import { KnowledgeGraphView } from '@/app/(main)/files/components/knowledge/knowledge-graph-view'
import type { KnowledgeArtifact } from '@/model/knowledge'

import {
  MemoryScopeNavigator,
  type MemoryScopeSelection,
} from './memory-scope-navigator'

interface MemoryExplorerProps {
  workspaceId: string
  userId: string
}

interface BadgedArtifact {
  artifact: KnowledgeArtifact
  scopeBadge: string
  agentId?: string
}

export function MemoryExplorer({ workspaceId, userId }: MemoryExplorerProps) {
  const [scope, setScope] = useState<MemoryScopeSelection>({
    kind: 'workspace',
  })

  return (
    <div className='flex h-full'>
      <MemoryScopeNavigator
        workspaceId={workspaceId}
        selected={scope}
        onSelect={setScope}
      />
      <div className='min-w-0 flex-1'>
        {scope.kind === 'workspace' && (
          <KnowledgeGraphView
            workspaceId={workspaceId}
            userId={userId}
            scopeLabel='Workspace Memory'
          />
        )}
        {scope.kind === 'agent' && (
          <KnowledgeGraphView
            workspaceId={workspaceId}
            userId={userId}
            agentId={scope.agentId}
            scopeLabel={`${scope.agentName}'s Memory`}
          />
        )}
        {scope.kind === 'all' && (
          <AllMemoryView workspaceId={workspaceId} userId={userId} />
        )}
      </div>
    </div>
  )
}

function AllMemoryView({
  workspaceId,
  userId,
}: {
  workspaceId: string
  userId: string
}) {
  const { isDark } = useTheme()
  const { data, loading, error } = useAllMemory({ workspaceId })
  const [selected, setSelected] = useState<BadgedArtifact | null>(null)

  if (loading && !data) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p
          className={cn('text-sm', isDark ? 'text-white/40' : 'text-black/40')}>
          Loading all memories…
        </p>
      </div>
    )
  }
  if (error) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className={cn('text-sm', isDark ? 'text-red-400' : 'text-red-600')}>
          {error.message}
        </p>
      </div>
    )
  }
  if (!data) return null

  const items: BadgedArtifact[] = [
    ...data.workspace.artifacts.map((artifact) => ({
      artifact,
      scopeBadge: 'workspace',
    })),
    ...data.agents.flatMap((agent) =>
      agent.artifacts.map((artifact) => ({
        artifact,
        scopeBadge: `agent: ${agent.agentName}`,
        agentId: agent.agentId,
      })),
    ),
  ]

  return (
    <div
      className={cn(
        'h-full overflow-auto',
        isDark ? 'bg-[#1a1a1a]' : 'bg-white',
      )}>
      <div
        className={cn(
          'border-b px-6 py-3',
          isDark ? 'border-white/[0.06]' : 'border-black/[0.06]',
        )}>
        <h2
          className={cn(
            'text-[16px] font-semibold tracking-[-0.02em]',
            isDark ? 'text-white' : 'text-black',
          )}>
          All memories
        </h2>
        <p
          className={cn(
            'mt-1 text-[12px]',
            isDark ? 'text-white/40' : 'text-black/40',
          )}>
          {items.length} artifacts across workspace + {data.agents.length} agent
          {data.agents.length === 1 ? '' : 's'}
        </p>
      </div>

      <div
        className={cn(
          'divide-y',
          isDark ? 'divide-white/5' : 'divide-black/5',
        )}>
        {items.length === 0 && (
          <div className='flex h-64 items-center justify-center'>
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              No memories yet
            </p>
          </div>
        )}
        {items.map((item, index) => (
          <div
            key={`${item.scopeBadge}:${item.artifact.id}`}
            className='relative'>
            <div
              className={cn(
                'absolute right-6 top-3 z-10 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider',
                isDark
                  ? 'bg-white/[0.06] text-white/50'
                  : 'bg-black/[0.05] text-black/50',
              )}>
              {item.scopeBadge}
            </div>
            <ArtifactCard
              artifact={item.artifact}
              onSelect={() => setSelected(item)}
              compact
              index={index}
            />
          </div>
        ))}
      </div>

      {selected && (
        <ArtifactViewer
          workspaceId={workspaceId}
          userId={userId}
          agentId={selected.agentId}
          artifactId={selected.artifact.id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
