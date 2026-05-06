'use client'

import {
  RiFileTextLine,
  RiRefreshLine,
  RiTestTubeLine,
  RiUser6Fill,
} from '@remixicon/react'
import { useCallback, useEffect, useState } from 'react'

import { WorkspaceAgentsFetcher } from '@/components/features/agents/workspace-agents-fetcher'
import { AnimatedListItem, ListDetailView, Typography } from '@/components/ui'
import { Toggle } from '@/components/ui/toggle'
import { useAuth } from '@/hooks/auth/use-auth'
import { useAppEvents } from '@/hooks/core/use-app-events'
import { useTabs } from '@/hooks/core/use-tabs'
import { useDisableAgent } from '@/hooks/features/agents/use-disable-agent'
import { useEnableAgent } from '@/hooks/features/agents/use-enable-agent'
import { useGetWorkspaceAgents } from '@/hooks/features/agents/use-get-workspace-agents'
import { useGetUserWorkspaces } from '@/hooks/features/workspace/use-get-user-workspaces'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

const AgentListItem = ({
  agent,
  isDark,
  index,
  onToggleActive,
  workspaceId,
}: {
  agent: ClaudeCodeAgent
  isDark: boolean
  index: number
  onToggleActive: (agentId: string, isActive: boolean) => void
  workspaceId?: string
}) => {
  const { openFileTab } = useTabs()
  const { session } = useAuth()

  const handleClick = async () => {
    if (!workspaceId) return

    // Open agent detail in a new tab
    const fileId = `${workspaceId}/agent/${agent.id}`
    await openFileTab(fileId, {
      name: agent.name,
      fileType: 'agent_detail',
      scope: 'user',
      scopeId: session?.user?.id || '',
    })
  }

  const handleToggleChange = (checked: boolean) => {
    onToggleActive(agent.id, checked)
  }

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'code-reviewer':
        return <RiUser6Fill className='h-4 w-4' />
      case 'documentation-writer':
        return <RiFileTextLine className='h-4 w-4' />
      case 'test-generator':
        return <RiTestTubeLine className='h-4 w-4' />
      case 'refactoring-assistant':
        return <RiRefreshLine className='h-4 w-4' />
      default:
        return <RiUser6Fill className='h-4 w-4' />
    }
  }

  return (
    <AnimatedListItem onClick={handleClick} index={index} isDark={isDark}>
      <div className='px-6 py-5'>
        {/* First Line - Agent Name & Badges */}
        <div className='mb-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full',
                  isDark
                    ? 'bg-white/5 text-white/70'
                    : 'bg-black/[0.03] text-black/70',
                )}>
                {getAgentIcon(agent.id)}
              </div>
              <Typography variant='body' className='!text-[14px] font-semibold'>
                {agent.name}
              </Typography>
            </div>

            <div className='flex items-center gap-2'>
              {(agent.metadata?.isSystemAgent || agent.isSystemAgent) && (
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-[11px] font-medium',
                    'bg-blue-500/10 text-blue-400',
                  )}>
                  System
                </span>
              )}
              <Toggle
                size='small'
                checked={agent.isActive ?? true}
                onChange={handleToggleChange}
                isDark={isDark}
              />
            </div>
          </div>
        </div>

        {/* Second Line - Description */}
        <div className='mb-2'>
          <Typography
            variant='bodyRegular'
            className={cn(
              'line-clamp-2 !text-[14px]',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            {agent.description}
          </Typography>
        </div>

        {/* Third Line - Tools Info */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <span
              className={cn(
                'text-[11px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              {agent.allowedTools.length} tools
            </span>
          </div>

          {/* Tags */}
          {(agent.metadata?.tags || agent.tags) &&
            (agent.metadata?.tags || agent.tags).length > 0 && (
              <div className='flex items-center gap-1.5'>
                {(agent.metadata?.tags || agent.tags).slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'rounded px-2 py-0.5 font-mono text-[10px]',
                      isDark
                        ? 'bg-white/5 text-white/40'
                        : 'bg-black/[0.02] text-black/40',
                    )}>
                    {tag}
                  </span>
                ))}
                {(agent.metadata?.tags || agent.tags).length > 2 && (
                  <span
                    className={cn(
                      'text-[10px]',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}>
                    +{(agent.metadata?.tags || agent.tags).length - 2}
                  </span>
                )}
              </div>
            )}
        </div>
      </div>
    </AnimatedListItem>
  )
}

interface AgentListProps {
  workspaceId?: string // If provided, only fetch agents from this workspace
  searchQuery?: string // Search query for client-side filtering
  filterTab?: string // Filter by tab: 'all', 'my', 'system'
}

// Sub-component imported from shared module to avoid duplication.

export function AgentList({
  workspaceId,
  searchQuery = '',
  filterTab = 'all',
}: AgentListProps) {
  const { isDark } = useTheme()
  const [allAgents, setAllAgents] = useState<ClaudeCodeAgent[]>([])
  const [pendingToggle, setPendingToggle] = useState<{
    workspaceId: string
    agentId: string
    enable: boolean
  } | null>(null)

  // Single-workspace path
  const {
    data: singleWsData,
    loading: singleWsLoading,
    mutate: mutateSingle,
  } = useGetWorkspaceAgents(workspaceId ?? '', { includeSystem: 'true' })

  // Multi-workspace path
  const { data: workspacesData, loading: wsLoading } = useGetUserWorkspaces()
  const workspaceIds = workspaceId
    ? []
    : (workspacesData?.workspaces?.map((w) => w.id) ?? [])

  // State-driven enable/disable
  const [enableAgent] = useEnableAgent(
    pendingToggle?.workspaceId ?? '',
    pendingToggle?.agentId ?? '',
  )
  const [disableAgent] = useDisableAgent(
    pendingToggle?.workspaceId ?? '',
    pendingToggle?.agentId ?? '',
  )

  useEffect(() => {
    if (!pendingToggle) return
    const fn = pendingToggle.enable ? enableAgent : disableAgent
    fn({})
      .then(() => mutateSingle())
      .catch(console.error)
      .finally(() => setPendingToggle(null))
  }, [pendingToggle])

  // Sync single-workspace data into allAgents
  useEffect(() => {
    if (workspaceId && singleWsData?.agents) {
      setAllAgents(
        singleWsData.agents.map((a) => ({
          ...a,
          workspaceId,
        })) as unknown as ClaudeCodeAgent[],
      )
    }
  }, [singleWsData, workspaceId])

  const handleWorkspaceAgents = useCallback(
    (wsId: string, agents: ClaudeCodeAgent[]) => {
      setAllAgents((prev) => {
        const withoutWs = prev.filter((a) => a.workspaceId !== wsId)
        return [...withoutWs, ...agents]
      })
    },
    [],
  )

  const loading = workspaceId ? singleWsLoading : wsLoading

  useAppEvents({
    agentCreated: () => mutateSingle(),
    agentDeleted: () => mutateSingle(),
  })

  // Client-side filtering by tab and search
  const filteredAgents = allAgents.filter((agent) => {
    // Filter by tab
    const isSystemAgent = agent.metadata?.isSystemAgent || agent.isSystemAgent
    if (filterTab === 'my' && isSystemAgent) return false
    if (filterTab === 'system' && !isSystemAgent) return false

    // Filter by search query
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return agent.name.toLowerCase().includes(query)
  })

  const handleToggleActive = (agentId: string, isActive: boolean) => {
    const agent = allAgents.find((a) => a.id === agentId)
    if (!agent?.workspaceId) return
    setPendingToggle({
      workspaceId: agent.workspaceId,
      agentId,
      enable: isActive,
    })
    setAllAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, isActive } : a)),
    )
  }

  return (
    <ListDetailView
      loading={loading}
      loadingText='Loading agents...'
      emptyTitle='No agents'
      emptyDescription='Create your first agent to get started'
      isDark={isDark}>
      {/* Invisible sub-components that fetch agents per workspace for the multi-workspace path */}
      {workspaceIds.map((wsId) => (
        <WorkspaceAgentsFetcher
          key={wsId}
          wsId={wsId}
          onAgents={handleWorkspaceAgents}
        />
      ))}
      {filteredAgents.map((agent, index) => (
        <AgentListItem
          key={agent.id}
          agent={agent}
          isDark={isDark}
          workspaceId={workspaceId}
          index={index}
          onToggleActive={handleToggleActive}
        />
      ))}
    </ListDetailView>
  )
}
