'use client'

import {
  RiCheckboxCircleLine,
  RiCircleLine,
  RiRefreshLine,
  RiSearchLine,
} from '@remixicon/react'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'
import { useDisableMcpServer } from '@/hooks/features/mcp/use-disable-mcp-server'
import { useEnableMcpServer } from '@/hooks/features/mcp/use-enable-mcp-server'
import { useGetMcpSources } from '@/hooks/features/mcp/use-get-mcp-sources'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface MCPConfigEditorProps {
  workspaceId: string
  onClose?: () => void
}

export function MCPConfigEditor({
  workspaceId,
  onClose,
}: MCPConfigEditorProps) {
  const { isDark } = useTheme()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredServer, setHoveredServer] = useState<string | null>(null)
  const [pendingToggle, setPendingToggle] = useState<{
    name: string
    enable: boolean
  } | null>(null)

  const {
    data: sourcesData,
    loading: isLoading,
    mutate: mutateSources,
  } = useGetMcpSources(workspaceId)
  const availableServers = sourcesData?.availableServers ?? []
  const selectedServers = new Set<string>(sourcesData?.enabledInWorkspace ?? [])

  const [enableServer] = useEnableMcpServer(
    workspaceId,
    pendingToggle?.name ?? '',
  )
  const [disableServer] = useDisableMcpServer(
    workspaceId,
    pendingToggle?.name ?? '',
  )

  useEffect(() => {
    if (!pendingToggle) return
    const fn = pendingToggle.enable ? enableServer : disableServer
    fn({})
      .then(() => mutateSources())
      .catch(console.error)
      .finally(() => setPendingToggle(null))
  }, [pendingToggle])

  const handleToggleSource = (serverName: string) => {
    setPendingToggle({
      name: serverName,
      enable: !selectedServers.has(serverName),
    })
  }

  const categories = [
    ...new Set(
      availableServers.map((s) => s.category).filter((c): c is string => !!c),
    ),
  ]
  const serversByCategory = availableServers.reduce<Record<string, any[]>>(
    (acc, s) => {
      if (s.category) {
        acc[s.category] = [...(acc[s.category] ?? []), s]
      }
      return acc
    },
    {},
  )

  // Filter servers based on category and search
  const filteredServers =
    selectedCategory === 'all'
      ? availableServers
      : availableServers.filter((s) => s.category === selectedCategory)

  const searchedServers = filteredServers.filter(
    (server) =>
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className='flex h-full max-h-[80vh] w-full flex-col'>
      {/* Elegant Header */}
      <div
        className={cn(
          'border-b px-6 py-4',
          isDark
            ? 'border-white/[0.08] bg-black/20'
            : 'border-black/[0.06] bg-white',
        )}>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <h3
              className={cn(
                'text-lg font-semibold tracking-tight',
                isDark ? 'text-white' : 'text-[#1d1d1f]',
              )}>
              MCP Connectors
            </h3>
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-white/60' : 'text-[#86868b]',
              )}>
              Connect your workspace to powerful MCP servers
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <m.button
              onClick={() => mutateSources()}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isDark
                  ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12]'
                  : 'bg-black/[0.04] text-black/80 hover:bg-black/[0.08]',
                isLoading && 'pointer-events-none opacity-50',
              )}>
              <RiRefreshLine
                className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
              />
              Refresh
            </m.button>
          </div>
        </div>

        {/* Search Bar */}
        <div className='mt-4'>
          <div
            className={cn(
              'relative flex items-center rounded-xl border transition-all',
              isDark
                ? 'border-white/[0.12] bg-white/[0.03] focus-within:border-white/[0.2] focus-within:bg-white/[0.05]'
                : 'border-black/[0.08] bg-black/[0.02] focus-within:border-black/[0.12] focus-within:bg-black/[0.03]',
            )}>
            <Input
              type='text'
              placeholder='Search connectors...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant='ghost'
              size='small'
              isDark={isDark}
              iconLeft={<RiSearchLine className='h-4 w-4' />}
              showClear
              onClear={() => setSearchQuery('')}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className='mt-4 flex flex-wrap gap-2'>
          <CategoryPill
            label='All'
            count={availableServers.length}
            isActive={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            isDark={isDark}
          />
          {categories.map((category) => (
            <CategoryPill
              key={category}
              label={category.charAt(0).toUpperCase() + category.slice(1)}
              count={serversByCategory[category]?.length || 0}
              isActive={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              isDark={isDark}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className='flex-1 overflow-y-auto p-6'>
        {isLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <RiRefreshLine
              className={cn(
                'h-8 w-8 animate-spin',
                isDark ? 'text-white/40' : 'text-black/40',
              )}
            />
          </div>
        ) : searchedServers.length === 0 ? (
          <div className='flex h-64 flex-col items-center justify-center'>
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-white/60' : 'text-[#86868b]',
              )}>
              {searchQuery
                ? 'No connectors match your search'
                : 'No connectors available'}
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
            <AnimatePresence mode='popLayout'>
              {searchedServers.map((server, index) => (
                <ServerCard
                  key={server.name}
                  server={server}
                  isSelected={server.enabledInWorkspace}
                  isEnabled={server.enabled !== false}
                  isHovered={hoveredServer === server.name}
                  onHover={() => setHoveredServer(server.name)}
                  onLeave={() => setHoveredServer(null)}
                  onClick={() => handleToggleSource(server.name)}
                  isDark={isDark}
                  delay={index * 0.02}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Elegant Footer */}
      <div
        className={cn(
          'flex items-center justify-between border-t px-6 py-4',
          isDark
            ? 'border-white/[0.08] bg-black/20'
            : 'border-black/[0.06] bg-white',
        )}>
        <div className='flex items-center gap-2'>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
              isDark
                ? 'bg-white/[0.12] text-white'
                : 'bg-black/[0.08] text-black',
            )}>
            {selectedServers.size}
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              isDark ? 'text-white/80' : 'text-black/80',
            )}>
            {selectedServers.size === 1 ? 'Connector' : 'Connectors'} Active
          </span>
        </div>

        <m.button
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'rounded-xl px-6 py-2 text-sm font-semibold transition-colors',
            isDark
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-black text-white hover:bg-black/90',
          )}>
          Done
        </m.button>
      </div>
    </div>
  )
}

// Category Pill Component
interface CategoryPillProps {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
  isDark: boolean
}

function CategoryPill({
  label,
  count,
  isActive,
  onClick,
  isDark,
}: CategoryPillProps) {
  return (
    <m.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative overflow-hidden rounded-full px-4 py-1.5 text-xs font-medium transition-all',
        isActive
          ? isDark
            ? 'bg-white text-black shadow-sm'
            : 'bg-black text-white shadow-sm'
          : isDark
            ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12]'
            : 'bg-black/[0.06] text-black/80 hover:bg-black/[0.10]',
      )}>
      <span className='relative z-10 flex items-center gap-1.5'>
        {label}
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            isActive
              ? isDark
                ? 'bg-black/[0.12] text-black'
                : 'bg-white/[0.20] text-white'
              : isDark
                ? 'bg-white/[0.12] text-white/60'
                : 'bg-black/[0.08] text-black/60',
          )}>
          {count}
        </span>
      </span>
    </m.button>
  )
}

// Server Card Component
interface ServerCardProps {
  server: any
  isSelected: boolean
  isEnabled: boolean
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
  isDark: boolean
  delay: number
}

function ServerCard({
  server,
  isSelected,
  isEnabled,
  isHovered,
  onHover,
  onLeave,
  onClick,
  isDark,
  delay,
}: ServerCardProps) {
  return (
    <m.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay, duration: 0.2 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-300',
        isSelected
          ? isDark
            ? 'border-white/[0.24] bg-white/[0.08] shadow-lg'
            : 'border-black/[0.12] bg-black/[0.03] shadow-lg'
          : isDark
            ? 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.05]'
            : 'border-black/[0.06] bg-black/[0.01] hover:border-black/[0.10] hover:bg-black/[0.02]',
      )}>
      {/* Gradient Overlay for Selected */}
      {isSelected && (
        <m.div
          className='absolute inset-0 bg-gradient-to-br from-[#0098FC]/10 to-[#00D4FF]/10'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className='relative z-10 space-y-3'>
        {/* Header */}
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            <m.div
              animate={{
                scale: isSelected ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 0.3 }}>
              {isSelected ? (
                <RiCheckboxCircleLine
                  className={cn(
                    'h-5 w-5',
                    isDark ? 'text-white' : 'text-black',
                  )}
                />
              ) : (
                <RiCircleLine
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isDark
                      ? 'text-white/40 group-hover:text-white/60'
                      : 'text-black/40 group-hover:text-black/60',
                  )}
                />
              )}
            </m.div>
          </div>

          {/* Status Badge */}
          {isSelected && (
            <m.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                isEnabled
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-500/10 text-emerald-600'
                  : isDark
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-amber-500/10 text-amber-600',
              )}>
              {isEnabled ? 'Active' : 'Paused'}
            </m.div>
          )}
        </div>

        {/* Name & Category */}
        <div className='space-y-1'>
          <h4
            className={cn(
              'text-sm font-semibold tracking-tight',
              isDark ? 'text-white' : 'text-[#1d1d1f]',
            )}>
            {server.name}
          </h4>
          {server.category && (
            <span
              className={cn(
                'inline-block rounded-md px-2 py-0.5 text-[10px] font-medium',
                isDark
                  ? 'bg-white/[0.08] text-white/60'
                  : 'bg-black/[0.05] text-black/60',
              )}>
              {server.category}
            </span>
          )}
        </div>

        {/* Description */}
        {server.description && (
          <p
            className={cn(
              'line-clamp-2 text-xs leading-relaxed',
              isDark ? 'text-white/60' : 'text-[#86868b]',
            )}>
            {server.description}
          </p>
        )}

        {/* Command Preview - Show on hover */}
        <AnimatePresence>
          {isHovered && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='overflow-hidden'>
              <div
                className={cn(
                  'mt-2 rounded-lg border p-2 font-mono text-[10px]',
                  isDark
                    ? 'border-white/[0.08] bg-white/[0.03] text-white/70'
                    : 'border-black/[0.06] bg-black/[0.02] text-black/70',
                )}>
                <span className='opacity-60'>$</span> {server.command}
                {server.args &&
                  ` ${Array.isArray(server.args) ? server.args.join(' ') : server.args}`}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover Effect */}
      <m.div
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-300',
          isDark
            ? 'bg-gradient-to-br from-white/[0.02] to-white/[0.05]'
            : 'bg-gradient-to-br from-black/[0.01] to-black/[0.02]',
        )}
        animate={{ opacity: isHovered ? 1 : 0 }}
      />
    </m.div>
  )
}
