'use client'

import {
  RiAddLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiFolderLine,
  RiGitBranchLine,
  RiGlobalLine,
  RiRefreshLine,
  RiServerLine,
  RiSettings3Line,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExpandableSearchInput } from '@/components/ui/input'
import Spinner from '@/components/ui/spinner'
import { Tabs } from '@/components/ui/tabs'
import { Toggle } from '@/components/ui/toggle'
import { useAuth } from '@/hooks/auth/use-auth'
import { useAppEvents } from '@/hooks/core/use-app-events'
import { useTabs } from '@/hooks/core/use-tabs'
import { useWorkspace } from '@/hooks/core/use-workspace'
import type { MCPServer } from '@/hooks/features/mcp/types'
import { useDisableMcpServer } from '@/hooks/features/mcp/use-disable-mcp-server'
import { useEnableMcpServer } from '@/hooks/features/mcp/use-enable-mcp-server'
import { useGetMcpSources } from '@/hooks/features/mcp/use-get-mcp-sources'
import { useReconnectAllServers } from '@/hooks/features/mcp/use-mcp-reconnect'
import { useTheme } from '@/hooks/ui/use-theme'
import { getSourceLogoPath } from '@/lib/source-logos'
import { cn } from '@/lib/utils'

// Smooth easing — matches agents-viewer / get-started / add-tool viewers
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

// Get the appropriate icon component for a source
const getSourceIconComponent = (name: string) => {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('file') || lowerName.includes('filesystem')) {
    return RiFolderLine
  }
  if (lowerName.includes('git')) {
    return RiGitBranchLine
  }
  if (
    lowerName.includes('database') ||
    lowerName.includes('sqlite') ||
    lowerName.includes('postgres')
  ) {
    return RiDatabase2Line
  }
  if (
    lowerName.includes('fetch') ||
    lowerName.includes('web') ||
    lowerName.includes('http')
  ) {
    return RiGlobalLine
  }
  if (lowerName.includes('code') || lowerName.includes('github')) {
    return RiCodeSSlashLine
  }
  if (lowerName.includes('server')) {
    return RiServerLine
  }

  return RiSettings3Line
}

// Get the tab icon element for a source
const getSourceTabIcon = (
  name: string,
  presetId?: string,
): React.ReactElement => {
  const iconClass = 'h-3.5 w-3.5'
  const logoPath = getSourceLogoPath(presetId, name)

  if (logoPath) {
    return (
      <Image
        src={logoPath}
        alt={name}
        width={14}
        height={14}
        className={`${iconClass} object-contain`}
      />
    )
  }

  const IconComponent = getSourceIconComponent(name)
  return <IconComponent className={`${iconClass} text-[#0098FC]`} />
}

/**
 * Embedded sources viewer for the files page
 * Grid layout matching agents-viewer / get-started / add-tool pattern
 */
interface SourcesViewerProps {
  workspaceId?: string
}

export function SourcesViewer({
  workspaceId: workspaceIdProp,
}: SourcesViewerProps = {}) {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = workspaceIdProp || selectedWorkspace?.id
  const { isDark } = useTheme()
  const { session } = useAuth()
  const { openFileTab } = useTabs()
  const userId = session?.user?.id
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [showReconnectAllConfirm, setShowReconnectAllConfirm] = useState(false)
  const [reconnectAllMessage, setReconnectAllMessage] = useState<string | null>(
    null,
  )
  const [reconnectAll, { loading: reconnectingAll }] = useReconnectAllServers()
  const [pendingToggle, setPendingToggle] = useState<{
    name: string
    enable: boolean
  } | null>(null)

  const {
    data: sourcesData,
    loading,
    mutate: mutateSources,
  } = useGetMcpSources(workspaceId ?? '')
  const [enableServer] = useEnableMcpServer(
    workspaceId ?? '',
    pendingToggle?.name ?? '',
  )
  const [disableServer] = useDisableMcpServer(
    workspaceId ?? '',
    pendingToggle?.name ?? '',
  )

  const servers = useMemo<Record<string, MCPServer>>(() => {
    const map: Record<string, MCPServer> = {}
    sourcesData?.availableServers.forEach((s) => {
      if (s.name) map[s.name] = s as unknown as MCPServer
    })
    return map
  }, [sourcesData])

  useEffect(() => {
    if (!pendingToggle) return
    const fn = pendingToggle.enable ? enableServer : disableServer
    fn({})
      .then(() => mutateSources())
      .catch(console.error)
      .finally(() => setPendingToggle(null))
  }, [pendingToggle])

  const { emit } = useAppEvents({
    sourceCreated: () => mutateSources(),
    sourceDeleted: () => mutateSources(),
  })

  // When loading completes with 0 tools, auto-open the "Add Tool" tab
  const hasRedirected = useRef(false)
  useEffect(() => {
    if (
      !loading &&
      Object.keys(servers).length === 0 &&
      workspaceId &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true
      const fileId = `${workspaceId}/source/new`
      openFileTab(fileId, {
        name: 'Add Tool',
        fileType: 'source_create',
        scope: 'user',
        scopeId: userId || '',
      })
    }
  }, [loading, servers, workspaceId, userId, openFileTab])

  const handleToggleServer = useCallback(
    (name: string, enable: boolean) => {
      if (!workspaceId) return
      setPendingToggle({ name, enable })
    },
    [workspaceId, emit],
  )

  const handleServerClick = useCallback(
    async (name: string, server: MCPServer) => {
      if (!workspaceId) return

      const fileId = `${workspaceId}/source/${name}`
      await openFileTab(fileId, {
        name: name,
        fileType: 'source_detail',
        scope: 'user',
        scopeId: userId || '',
        icon: getSourceTabIcon(name, server.preset_id),
      })
    },
    [workspaceId, userId, openFileTab],
  )

  const handleAddNewSource = useCallback(async () => {
    if (!workspaceId) return

    const fileId = `${workspaceId}/source/new`
    await openFileTab(fileId, {
      name: 'Add Tool',
      fileType: 'source_create',
      scope: 'user',
      scopeId: userId || '',
    })
  }, [workspaceId, userId, openFileTab])

  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded)
    if (isSearchExpanded) {
      setSearchQuery('')
    }
  }

  // ─── Filtering ───
  const serverEntries = Object.entries(servers)

  const filteredServerEntries = useMemo(() => {
    return serverEntries.filter(([name, server]) => {
      // Tab filtering
      if (activeTab === 'active' && !server.enabled) return false
      if (activeTab === 'inactive' && server.enabled) return false

      // Search filtering
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        name.toLowerCase().includes(query) ||
        server.category?.toLowerCase().includes(query) ||
        server.description?.toLowerCase().includes(query)
      )
    })
  }, [serverEntries, activeTab, searchQuery])

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
  ]

  return (
    <div className='relative flex h-full flex-col overflow-hidden'>
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
            Tools
          </m.h1>

          <m.p
            variants={fadeUp}
            className={cn(
              'mb-10 max-w-[380px] text-center text-[15px] leading-relaxed',
              isDark ? 'text-white/50' : 'text-black/50',
            )}>
            Tools extend your agents with external services, data sources, and
            custom integrations via MCP.
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
          {/* Search + Reconnect All — above grid */}
          <div className='mb-3 flex items-center justify-end gap-2'>
            {reconnectAllMessage && (
              <span
                className={cn(
                  'mr-auto text-[12px]',
                  isDark ? 'text-white/50' : 'text-black/50',
                )}>
                {reconnectAllMessage}
              </span>
            )}
            <button
              onClick={() => setShowReconnectAllConfirm(true)}
              disabled={reconnectingAll}
              title='Reconnect all MCP servers'
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all',
                isDark
                  ? 'text-white/50 hover:bg-white/10 hover:text-white/70'
                  : 'text-black/50 hover:bg-black/10 hover:text-black/70',
              )}>
              {reconnectingAll ? (
                <Spinner size='sm' />
              ) : (
                <RiRefreshLine size={14} />
              )}
              Reconnect All
            </button>
            <ExpandableSearchInput
              isExpanded={isSearchExpanded}
              onToggle={handleSearchToggle}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search tools...'
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
                Loading tools...
              </m.div>
            </div>
          ) : (
            <div
              className={cn(
                'grid grid-cols-3 gap-px',
                isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]',
              )}>
              {/* Add tool cell — always first */}
              <m.button
                type='button'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: smoothEaseOut,
                }}
                onClick={handleAddNewSource}
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
                  Add tool
                </span>
                <span
                  className={cn(
                    'line-clamp-2 text-[13px] leading-relaxed',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Connect a new MCP tool or integration
                </span>
              </m.button>

              {/* Tool cells */}
              {filteredServerEntries.map(([name, server], index) => {
                const logoPath = getSourceLogoPath(server.preset_id, name)
                const IconComponent = getSourceIconComponent(name)

                return (
                  <m.div
                    key={name}
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
                      onClick={() => handleServerClick(name, server)}
                      className='flex flex-1 flex-col text-left'>
                      {/* Icon + category row */}
                      <div className='mb-3 flex items-center justify-between'>
                        <div className='flex h-[28px] w-[28px] items-center justify-center'>
                          {logoPath ? (
                            <Image
                              src={logoPath}
                              alt={name}
                              width={28}
                              height={28}
                              className='h-7 w-7 object-contain'
                            />
                          ) : (
                            <IconComponent
                              className={cn(
                                'h-[18px] w-[18px]',
                                isDark ? 'text-white/30' : 'text-black/30',
                              )}
                            />
                          )}
                        </div>
                        {server.category && (
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-medium',
                              isDark
                                ? 'bg-white/[0.06] text-white/40'
                                : 'bg-black/[0.04] text-black/40',
                            )}>
                            {server.category}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <span
                        className={cn(
                          'mb-2 text-[15px] font-medium',
                          isDark ? 'text-white/70' : 'text-black/70',
                        )}>
                        {name}
                      </span>

                      {/* Description */}
                      <span
                        className={cn(
                          'line-clamp-2 text-[13px] leading-relaxed',
                          isDark ? 'text-white/40' : 'text-black/40',
                        )}>
                        {server.description || 'No description'}
                      </span>
                    </button>

                    {/* Footer — status + toggle */}
                    <div className='mt-4 flex items-center justify-between'>
                      <span
                        className={cn(
                          'text-[11px]',
                          server.enabled
                            ? 'text-emerald-500/70'
                            : isDark
                              ? 'text-white/30'
                              : 'text-black/30',
                        )}>
                        {server.enabled ? 'Connected' : 'Disabled'}
                      </span>
                      <Toggle
                        size='small'
                        checked={server.enabled ?? false}
                        onChange={(checked) =>
                          handleToggleServer(name, checked)
                        }
                        isDark={isDark}
                      />
                    </div>
                  </m.div>
                )
              })}

              {/* Empty state — no results after filtering */}
              {filteredServerEntries.length === 0 && (
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
                      ? 'No tools match your search'
                      : 'No tools connected yet'}
                  </span>
                </m.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reconnect All Confirmation Modal */}
      {showReconnectAllConfirm && (
        <ConfirmDialog
          isDark={isDark}
          title='Reconnect all servers'
          message='This will restart all MCP server connections for this workspace. Any active agent executions may be interrupted.'
          confirmText='Reconnect All'
          onConfirm={async () => {
            setShowReconnectAllConfirm(false)
            const result = await reconnectAll()
            if (result?.message) {
              setReconnectAllMessage(result.message)
              setTimeout(() => setReconnectAllMessage(null), 5000)
            }
          }}
          onCancel={() => setShowReconnectAllConfirm(false)}
          isLoading={reconnectingAll}
        />
      )}
    </div>
  )
}
