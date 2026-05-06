'use client'

import {
  RiAddLine,
  RiFileTextLine,
  RiRefreshLine,
  RiTestTubeLine,
  RiUser6Fill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { WorkspaceAgentsFetcher } from '@/components/features/agents/workspace-agents-fetcher'
import { ExpandableSearchInput } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { useAuth } from '@/hooks/auth/use-auth'
import { useAppEvents } from '@/hooks/core/use-app-events'
import { useTabs } from '@/hooks/core/use-tabs'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useDisableAgent } from '@/hooks/features/agents/use-disable-agent'
import { useEnableAgent } from '@/hooks/features/agents/use-enable-agent'
import { useGetWorkspaceAgents } from '@/hooks/features/agents/use-get-workspace-agents'
import { useGetUserWorkspaces } from '@/hooks/features/workspace/use-get-user-workspaces'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import { ClaudeCodeAgent } from '@/model/claude-code-agent'

// Smooth easing — matches get-started / add-tool viewers
const smoothEaseOut = [0.22, 1, 0.36, 1] as const

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEaseOut },
  },
}

const getAgentIcon = (agentId: string) => {
  switch (agentId) {
    case 'code-reviewer':
      return RiUser6Fill
    case 'documentation-writer':
      return RiFileTextLine
    case 'test-generator':
      return RiTestTubeLine
    case 'refactoring-assistant':
      return RiRefreshLine
    default:
      return RiUser6Fill
  }
}

/**
 * Embedded agents viewer for the files page
 * Grid layout matching get-started / add-tool pattern
 */
interface AgentsViewerProps {
  workspaceId?: string
}

export function AgentsViewer({
  workspaceId: workspaceIdProp,
}: AgentsViewerProps = {}) {
  const { session } = useAuth()
  const { selectedWorkspace } = useWorkspace()
  const { openFileTab } = useTabs()
  const { isDark } = useTheme()
  const workspaceId = workspaceIdProp || selectedWorkspace?.id
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const userId = session?.user?.id

  // ─── Data fetching via workspace-scoped hooks ───
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

  const loading = workspaceId ? singleWsLoading : wsLoading

  // Sync single-workspace agents into local state
  useEffect(() => {
    if (workspaceId && singleWsData?.agents) {
      setAllAgents(
        singleWsData.agents.map(
          (a) => ({ ...a, workspaceId }) as unknown as ClaudeCodeAgent,
        ),
      )
    }
  }, [singleWsData, workspaceId])

  // Multi-workspace fetcher merges per-workspace results into parent state
  const handleWsAgents = useCallback(
    (wsId: string, agents: ClaudeCodeAgent[]) => {
      setAllAgents((prev) => {
        const withoutWs = prev.filter((a) => a.workspaceId !== wsId)
        return [...withoutWs, ...agents]
      })
    },
    [],
  )

  // Toggle hooks (pending-driven so we can target any agent)
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
    const fire = pendingToggle.enable ? enableAgent : disableAgent
    fire(undefined as never)
      .then(() => {
        setAllAgents((prev) =>
          prev.map((a) =>
            a.id === pendingToggle.agentId
              ? { ...a, isActive: pendingToggle.enable }
              : a,
          ),
        )
      })
      .catch((err) => console.error('Failed to toggle agent:', err))
      .finally(() => setPendingToggle(null))
  }, [pendingToggle, enableAgent, disableAgent])

  useAppEvents({
    agentCreated: () => mutateSingle(),
    agentDeleted: () => mutateSingle(),
  })

  // ─── Filtering ───
  const filteredAgents = useMemo(() => {
    return allAgents.filter((agent) => {
      const isSystemAgent = agent.metadata?.isSystemAgent || agent.isSystemAgent
      if (activeTab === 'my' && isSystemAgent) return false
      if (activeTab === 'system' && !isSystemAgent) return false

      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)
      )
    })
  }, [allAgents, activeTab, searchQuery])

  // ─── Actions ───
  const handleCreateNew = useCallback(async () => {
    if (!workspaceId) return
    const fileId = `${workspaceId}/agent/new`
    await openFileTab(fileId, {
      name: 'New Agent',
      fileType: 'agent_create',
      scope: 'user',
      scopeId: userId || '',
    })
  }, [workspaceId, userId, openFileTab])

  const handleAgentClick = useCallback(
    async (agent: ClaudeCodeAgent) => {
      if (!workspaceId) return
      const fileId = `${workspaceId}/agent/${agent.id}`
      await openFileTab(fileId, {
        name: agent.name,
        fileType: 'agent_detail',
        scope: 'user',
        scopeId: userId || '',
      })
    },
    [workspaceId, userId, openFileTab],
  )

  const handleToggleActive = useCallback(
    (agentId: string, isActive: boolean) => {
      if (!userId) return
      const agent = allAgents.find((a) => a.id === agentId)
      if (!agent || !agent.workspaceId) return
      setPendingToggle({
        workspaceId: agent.workspaceId,
        agentId,
        enable: isActive,
      })
    },
    [userId, allAgents],
  )

  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded)
    if (isSearchExpanded) {
      setSearchQuery('')
    }
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'my', label: 'My Agents' },
    { id: 'system', label: 'System' },
  ]

  return (
    <div className='relative flex h-full flex-col overflow-hidden'>
      {workspaceIds.map((wsId) => (
        <WorkspaceAgentsFetcher
          key={wsId}
          wsId={wsId}
          onAgents={handleWsAgents}
        />
      ))}
      <div className='flex-1 overflow-y-auto'>
        {/* Hero */}
        <m.div
          initial='hidden'
          animate='visible'
          variants={staggerContainer}
          className='flex flex-col items-center px-8 pt-12'>
          <m.h1
            variants={fadeUp}
            className={cn(
              'mb-4 text-center text-[32px] font-semibold tracking-[-0.03em]',
              isDark ? 'text-white' : 'text-black',
            )}>
            Agents
          </m.h1>

          <m.p
            variants={fadeUp}
            className={cn(
              'mb-10 max-w-[380px] text-center text-[15px] leading-relaxed',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            Agents work autonomously in your workspace — reading files, using
            tools, and running on schedules you define.
          </m.p>

          {/* Filter tabs */}
          <m.div variants={fadeUp} className='mb-2'>
            <Tabs
              tabs={tabs}
              value={activeTab}
              onChange={setActiveTab}
              variant='pill'
              size='small'
              isDark={isDark}
            />
          </m.div>
        </m.div>

        {/* Grid */}
        <div className='mx-auto mt-10 w-full max-w-3xl px-8 pb-32'>
          {/* Search — above grid, right-aligned */}
          <div className='mb-3 flex justify-end'>
            <ExpandableSearchInput
              isExpanded={isSearchExpanded}
              onToggle={handleSearchToggle}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search agents...'
              expandedWidth={220}
              isDark={isDark}
            />
          </div>
          {loading ? (
            <div className='flex justify-center py-20'>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'text-[13px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                Loading agents...
              </m.div>
            </div>
          ) : (
            <div
              className={cn(
                'grid grid-cols-3 gap-px',
                isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]',
              )}>
              {/* Create new agent cell — always first */}
              <m.button
                type='button'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: smoothEaseOut,
                }}
                onClick={handleCreateNew}
                className={cn(
                  'group flex flex-col px-6 py-6 text-left transition-colors duration-200',
                  isDark
                    ? 'bg-[#09090b] hover:bg-white/[0.03]'
                    : 'bg-white hover:bg-black/[0.02]',
                )}>
                <div className='mb-3 flex h-[28px] w-[28px] items-center justify-center'>
                  <RiAddLine
                    className={cn(
                      'h-[18px] w-[18px]',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'mb-2 text-[15px] font-medium',
                    isDark ? 'text-white/70' : 'text-black/70',
                  )}>
                  New agent
                </span>
                <span
                  className={cn(
                    'line-clamp-2 text-[13px] leading-relaxed',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Create and configure a new autonomous agent
                </span>
              </m.button>

              {/* Agent cells */}
              {filteredAgents.map((agent, index) => {
                const IconComponent = getAgentIcon(agent.id)
                const isSystemAgent =
                  agent.metadata?.isSystemAgent || agent.isSystemAgent

                return (
                  <m.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.15 + index * 0.04,
                      ease: smoothEaseOut,
                    }}
                    className={cn(
                      'group relative flex flex-col px-6 py-6 text-left transition-colors duration-200',
                      isDark
                        ? 'bg-[#09090b] hover:bg-white/[0.03]'
                        : 'bg-white hover:bg-black/[0.02]',
                    )}>
                    {/* Clickable area */}
                    <button
                      type='button'
                      onClick={() => handleAgentClick(agent)}
                      className='flex flex-1 flex-col text-left'>
                      {/* Icon + badges row */}
                      <div className='mb-3 flex items-center justify-between'>
                        <div className='flex h-[28px] w-[28px] items-center justify-center'>
                          <IconComponent
                            className={cn(
                              'h-[18px] w-[18px]',
                              isDark ? 'text-white/30' : 'text-black/30',
                            )}
                          />
                        </div>
                        {isSystemAgent && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-medium',
                              'bg-blue-500/10 text-blue-400',
                            )}>
                            System
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <span
                        className={cn(
                          'mb-2 text-[15px] font-medium',
                          isDark ? 'text-white/70' : 'text-black/70',
                        )}>
                        {agent.name}
                      </span>

                      {/* Description */}
                      <span
                        className={cn(
                          'line-clamp-2 text-[13px] leading-relaxed',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}>
                        {agent.description || 'No description'}
                      </span>
                    </button>

                    {/* Footer — tool count + toggle */}
                    <div className='mt-4 flex items-center justify-between'>
                      <span
                        className={cn(
                          'text-[11px]',
                          isDark ? 'text-white/30' : 'text-black/30',
                        )}>
                        {agent.allowedTools?.length || 0} tools
                      </span>
                      <Toggle
                        size='small'
                        checked={agent.isActive ?? true}
                        onChange={(checked) =>
                          handleToggleActive(agent.id, checked)
                        }
                        isDark={isDark}
                      />
                    </div>
                  </m.div>
                )
              })}

              {/* Empty state — no results after filtering */}
              {filteredAgents.length === 0 && (
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease: smoothEaseOut }}
                  className={cn(
                    'col-span-3 flex flex-col items-center justify-center px-6 py-12',
                    isDark ? 'bg-[#09090b]' : 'bg-white',
                  )}>
                  <span
                    className={cn(
                      'text-[13px]',
                      isDark ? 'text-white/30' : 'text-black/30',
                    )}>
                    {searchQuery
                      ? 'No agents match your search'
                      : 'No agents yet'}
                  </span>
                </m.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
