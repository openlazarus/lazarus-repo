'use client'

import { RiCalendarLine, RiMailLine, RiTimeLine } from '@remixicon/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ExecutingTask } from '@/components/features/activity/execution-card'
import { DashboardPageLayout } from '@/components/features/dashboard'
import { ContributionGraph } from '@/components/ui'
import { ExpandableSearchInput } from '@/components/ui/input'
import Spinner from '@/components/ui/spinner'
import { useTagger } from '@/hooks/core/use-tagger'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useContributionData } from '@/hooks/features/activity'
import { useGetTriggers } from '@/hooks/features/agents/use-get-triggers'
import { useGetWorkspaceAgents } from '@/hooks/features/agents/use-get-workspace-agents'
import { useGetLogs, useLogsSocket } from '@/hooks/features/logs'
import { useTheme } from '@/hooks/ui/use-theme'
import { useAgentStatus } from '@/hooks/use-agent-status'
import { cn } from '@/lib/utils'
import { Item } from '@/model'
import { Log, LogFilter } from '@/model/log'

import { ActivityLogItem } from './activity-log-item'
import { LiveExecutionCard } from './live-execution-card'

const LOG_STATUS_TO_TASK_STATUS: Record<string, ExecutingTask['status']> = {
  failed: 'error',
  executing: 'executing',
  pending: 'executing',
}

// Types for autopilot/triggers
interface AutopilotTrigger {
  id: string
  type: 'scheduled' | 'email' | 'webhook' | 'external'
  agentId: string
  agentName: string
  workspaceId: string
  enabled: boolean
  config: any
  createdAt?: string
}

interface AgentWithTriggers {
  id: string
  name: string
  triggers: AutopilotTrigger[]
}

// Sub-component: fetches triggers for one agent and reports them up
function AgentTriggersFetcher({
  workspaceId,
  agentId,
  agentName,
  onTriggers,
}: {
  workspaceId: string
  agentId: string
  agentName: string
  onTriggers: (agentId: string, agentName: string, triggers: any[]) => void
}) {
  const { data } = useGetTriggers(workspaceId, agentId)
  useEffect(() => {
    if (data?.triggers) onTriggers(agentId, agentName, data.triggers)
  }, [data])
  return null
}

/**
 * Embedded activity viewer for the files page
 * Shows activity logs and execution history
 * Gets workspace context from prop or useWorkspace hook
 */
interface ActivityViewerProps {
  workspaceId?: string
}

// Tab configuration
const ACTIVITY_TABS = [
  { id: 'history', label: 'What Happened' },
  { id: 'upcoming', label: "What's Next" },
]

export function ActivityViewer({
  workspaceId: workspaceIdProp,
}: ActivityViewerProps = {}) {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = workspaceIdProp || selectedWorkspace?.id || ''
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('history')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [activeFilters, setActiveFilters] = useState<LogFilter>({
    actors: [],
    actorTypes: [],
    types: [],
    memoryCells: [],
    apps: [],
  })
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date
    end: Date
  } | null>(null)

  // State for "What's Next" tab
  const [scheduledTriggers, setScheduledTriggers] = useState<
    AutopilotTrigger[]
  >([])

  const { data: agentsData, loading: loadingTriggers } = useGetWorkspaceAgents(
    activeTab === 'upcoming' ? (workspaceId ?? '') : '',
  )
  const agentsForTriggers =
    activeTab === 'upcoming' ? (agentsData?.agents ?? []) : []

  const handleAgentTriggers = useCallback(
    (agentId: string, agentName: string, triggers: any[]) => {
      setScheduledTriggers((prev) => {
        const withoutAgent = prev.filter((t) => t.agentId !== agentId)
        const newTriggers = triggers
          .filter((t) => t.enabled)
          .map((t) => ({
            ...t,
            agentId,
            agentName,
            workspaceId,
          }))
        return [...withoutAgent, ...newTriggers]
      })
    },
    [workspaceId],
  )

  const {
    logs,
    loading: isLoading,
    error,
    loadMore,
    hasMore,
    mutate: refresh,
  } = useGetLogs(workspaceId, {
    pageSize: 20,
    search: searchQuery || undefined,
    ...activeFilters,
    dateRange: selectedDateRange || undefined,
  })

  // Real-time agent execution state from WebSocket
  const { tasks: liveTasks } = useAgentStatus(workspaceId)

  // Live tasks that should appear in the activity feed (executing or awaiting approval)
  const activeLiveTasks = useMemo(
    () =>
      liveTasks.filter(
        (t) => t.status === 'executing' || t.status === 'awaiting_approval',
      ),
    [liveTasks],
  )

  // WebSocket connection for real-time updates (executing tasks)
  const { isConnected } = useLogsSocket({
    workspaceId,
    enabled: !!workspaceId,
    onLogCreated: (log) => {
      console.log('[ActivityViewer] New log created:', log.id, log.title)
      // Do NOT refresh here — live execution cards are handled by useAgentStatus.
      // The socket hook's handleRefresh on agent:stopped handles showing completed logs.
    },
    onLogUpdated: (log) => {
      console.log('[ActivityViewer] Log updated:', log.id, log.title)
      // Do NOT refresh here — the socket hook's handleRefresh on terminal events
      // (agent:stopped, agent:error) already handles this.
    },
  })

  // Fetch contribution data from API (full year, not just loaded logs)
  const { contributionData, year } = useContributionData(workspaceId)

  // Filter logs by selected date range (client-side filtering for immediate feedback)
  const filteredLogs = useMemo(() => {
    if (!selectedDateRange) return logs

    return logs.filter((log) => {
      const logDate = new Date(log.timestamp)
      return (
        logDate >= selectedDateRange.start && logDate <= selectedDateRange.end
      )
    })
  }, [logs, selectedDateRange])

  const { tagItem, untagItem } = useTagger()

  const handleTagUpdate = useCallback(
    async (logId: string, isTagged: boolean, logItem?: Item) => {
      try {
        if (isTagged && logItem) {
          await untagItem('current', logItem.id)
        } else if (!isTagged && logItem) {
          await tagItem('current', logItem.id)
        }
      } catch (error) {
        console.error('Failed to update tag:', error)
      }
    },
    [tagItem, untagItem],
  )

  const handleSync = async () => {
    await refresh()
  }

  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded)
    if (isSearchExpanded) {
      setSearchQuery('')
    }
  }

  // Custom header actions with expandable search
  const headerActions = (
    <ExpandableSearchInput
      isExpanded={isSearchExpanded}
      onToggle={handleSearchToggle}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder='Search activity...'
      expandedWidth={180}
      isDark={isDark}
    />
  )

  // Handle opening activity detail in a new tab
  const handleActivityClick = useCallback(
    (log: Log) => {
      if (!workspaceId) return

      // Open activity detail as a new tab
      window.dispatchEvent(
        new CustomEvent('openFile', {
          detail: {
            file: {
              path: `activity/${log.id}`,
              name: log.conversationTitle || log.title || 'Activity',
              fileType: 'activity_detail',
            },
            workspace: { id: workspaceId },
          },
        }),
      )
    },
    [workspaceId],
  )

  const handleDayClick = (day: { date: Date }) => {
    const endOfDay = new Date(day.date)
    endOfDay.setHours(23, 59, 59, 999)
    setSelectedDateRange({ start: day.date, end: endOfDay })
  }

  const handlePeriodSelect = (start: Date, end: Date) => {
    // Select date range
    const endOfDay = new Date(end)
    endOfDay.setHours(23, 59, 59, 999)
    setSelectedDateRange({ start, end: endOfDay })
  }

  // Convert Log to ExecutingTask for display
  const logToTask = (log: Log): ExecutingTask => {
    // Extract description from various sources
    let description = ''

    // Try memoryLog or systemLog first
    if (log.memoryLog || log.systemLog) {
      description = log.memoryLog || log.systemLog || ''
    }
    // Otherwise, build description from changes
    else if (log.changes && log.changes.length > 0) {
      description = log.changes
        .map((change) => change.description)
        .filter(Boolean)
        .join('; ')
    }
    // Or from apps
    else if (log.apps && log.apps.length > 0) {
      description = log.apps
        .map((app) => `${app.name}: ${app.action}`)
        .filter(Boolean)
        .join('; ')
    }

    // Fallback
    if (!description) {
      description = 'Completed successfully'
    }

    return {
      id: log.id,
      type: log.actor.type === 'agent' ? 'agent' : 'task',
      title: log.title,
      description,
      status: LOG_STATUS_TO_TASK_STATUS[log.status || ''] || 'completed',
      workspace: log.workspaceName || log.workspaceId,
      startedAt: log.timestamp,
      completedAt: log.timestamp, // For historical logs, completed at same time
    }
  }

  // Loading state content for "What Happened" tab
  const renderHistoryLoading = () => (
    <div className='flex h-64 items-center justify-center'>
      <Spinner size='lg' />
    </div>
  )

  // Error state content for "What Happened" tab
  const renderHistoryError = () => (
    <div className='flex h-64 items-center justify-center'>
      <div className='text-sm text-red-500'>Failed to load activity logs</div>
    </div>
  )

  // Helper function to get trigger description
  const getTriggerDescription = (trigger: AutopilotTrigger) => {
    switch (trigger.type) {
      case 'scheduled':
        const scheduleType = trigger.config?.schedule?.type
        const expression = trigger.config?.schedule?.expression
        if (scheduleType === 'interval') {
          return `Runs every ${expression || 'interval'}`
        } else if (scheduleType === 'once') {
          return 'Runs once at a specific time'
        }
        return 'Runs at specific times'
      case 'email':
        return 'Runs when an email comes in'
      case 'webhook':
        return 'Runs when other apps signal'
      default:
        return 'Runs when something else happens'
    }
  }

  // Helper function to get trigger icon
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'scheduled':
        return <RiCalendarLine className='h-4 w-4' />
      case 'email':
        return <RiMailLine className='h-4 w-4' />
      default:
        return <RiTimeLine className='h-4 w-4' />
    }
  }

  // Helper function to get trigger type label
  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case 'scheduled':
        return 'Timer'
      case 'email':
        return 'Email'
      case 'webhook':
        return 'App Signal'
      default:
        return 'External'
    }
  }

  return (
    <DashboardPageLayout
      title='Activity'
      onSync={handleSync}
      showSync={true}
      showSearch={false}
      showFilter={false}
      syncing={isLoading}
      headerTabs={ACTIVITY_TABS}
      activeHeaderTab={activeTab}
      onHeaderTabChange={setActiveTab}
      headerActions={headerActions}>
      <div className='p-6'>
        {/* What Happened Tab */}
        {activeTab === 'history' && (
          <div>
            {isLoading && logs.length === 0 ? (
              renderHistoryLoading()
            ) : error ? (
              renderHistoryError()
            ) : (
              <>
                {/* Contribution Graph */}
                {logs.length > 0 && (
                  <div className='mb-6 rounded-lg border border-[hsl(var(--border))] p-4'>
                    <ContributionGraph
                      data={contributionData}
                      year={year}
                      isDark={isDark}
                      onDayClick={handleDayClick}
                      onPeriodSelect={handlePeriodSelect}
                    />
                  </div>
                )}

                {/* Activity List */}
                <div className='space-y-3'>
                  {filteredLogs.length === 0 && activeLiveTasks.length === 0 ? (
                    <div className='flex h-64 flex-col items-center justify-center text-center'>
                      <RiTimeLine
                        className={cn(
                          'mb-3 h-10 w-10',
                          isDark ? 'text-white/20' : 'text-black/20',
                        )}
                      />
                      <p
                        className={cn(
                          'text-[14px] font-medium',
                          isDark ? 'text-white/70' : 'text-black/70',
                        )}>
                        No activity yet
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-[12px]',
                          isDark ? 'text-white/50' : 'text-black/50',
                        )}>
                        {selectedDateRange
                          ? 'No activity in selected date range'
                          : 'When agents run, you will see what they did here'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Live executing tasks at the top with real-time progress + stop */}
                      {activeLiveTasks.map((task, i) => (
                        <LiveExecutionCard
                          key={task.id}
                          task={task}
                          isDark={isDark}
                          index={i}
                        />
                      ))}

                      {filteredLogs.map((log, index) => {
                        const task = logToTask(log)

                        // Skip executing/pending logs — live execution cards
                        // handle these via WebSocket
                        if (
                          task.status === 'executing' ||
                          task.status === 'paused'
                        ) {
                          return null
                        }

                        // Rich activity log item for completed activities
                        return (
                          <ActivityLogItem
                            key={log.id}
                            log={log}
                            isDark={isDark}
                            index={index}
                            onClick={handleActivityClick}
                          />
                        )
                      })}

                      {/* Load More Button */}
                      {hasMore && !selectedDateRange && (
                        <div className='flex justify-center py-4'>
                          <button
                            onClick={loadMore}
                            disabled={isLoading}
                            className={cn(
                              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                              'bg-[hsl(var(--input))] text-[hsl(var(--text-secondary))]',
                              'hover:bg-[hsl(var(--border))] hover:text-[hsl(var(--text-primary))]',
                              isLoading && 'cursor-not-allowed opacity-50',
                            )}>
                            {isLoading ? 'Loading...' : 'Load More'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* What's Next Tab */}
        {/* Fetch triggers per agent invisibly */}
        {agentsForTriggers.map((agent) => (
          <AgentTriggersFetcher
            key={agent.id}
            workspaceId={workspaceId ?? ''}
            agentId={agent.id}
            agentName={agent.name}
            onTriggers={handleAgentTriggers}
          />
        ))}

        {activeTab === 'upcoming' && (
          <div>
            {loadingTriggers ? (
              <div className='flex h-64 items-center justify-center'>
                <Spinner size='lg' />
              </div>
            ) : scheduledTriggers.length === 0 ? (
              <div className='flex h-64 flex-col items-center justify-center text-center'>
                <RiCalendarLine
                  className={cn(
                    'mb-3 h-10 w-10',
                    isDark ? 'text-white/20' : 'text-black/20',
                  )}
                />
                <p
                  className={cn(
                    'text-[14px] font-medium',
                    isDark ? 'text-white/70' : 'text-black/70',
                  )}>
                  Nothing scheduled
                </p>
                <p
                  className={cn(
                    'mt-1 max-w-xs text-[12px]',
                    isDark ? 'text-white/50' : 'text-black/50',
                  )}>
                  Schedule work on an agent to see upcoming tasks here
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                <p
                  className={cn(
                    'mb-4 text-[13px]',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}>
                  {scheduledTriggers.length} scheduled{' '}
                  {scheduledTriggers.length === 1 ? 'task' : 'tasks'} active
                </p>
                {scheduledTriggers.map((trigger) => (
                  <div
                    key={`${trigger.agentId}-${trigger.id}`}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-4 transition-colors',
                      isDark
                        ? 'border-white/10 hover:bg-white/5'
                        : 'border-black/10 hover:bg-black/5',
                    )}>
                    <div className='flex items-center gap-3'>
                      <div
                        className={cn(
                          'rounded-full p-2.5',
                          isDark ? 'bg-white/10' : 'bg-black/10',
                        )}>
                        {getTriggerIcon(trigger.type)}
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='text-[14px] font-medium'>
                            {trigger.agentName}
                          </p>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-medium',
                              isDark
                                ? 'bg-[#0098FC]/20 text-[#0098FC]'
                                : 'bg-[#0098FC]/10 text-[#0098FC]',
                            )}>
                            {getTriggerTypeLabel(trigger.type)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'mt-0.5 text-[12px]',
                            isDark ? 'text-white/50' : 'text-black/50',
                          )}>
                          {getTriggerDescription(trigger)}
                        </p>
                        {trigger.config?.task && (
                          <p
                            className={cn(
                              'mt-1 text-[11px] italic',
                              isDark ? 'text-white/40' : 'text-black/40',
                            )}>
                            "{trigger.config.task}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardPageLayout>
  )
}
