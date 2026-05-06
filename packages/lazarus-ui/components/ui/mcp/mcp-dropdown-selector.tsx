'use client'

import { RiRefreshLine, RiSettings3Line } from '@remixicon/react'
import { m } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Toggle } from '@/components/ui/toggle'
import { useDisableMcpServer } from '@/hooks/features/mcp/use-disable-mcp-server'
import { useEnableMcpServer } from '@/hooks/features/mcp/use-enable-mcp-server'
import { useGetMcpSources } from '@/hooks/features/mcp/use-get-mcp-sources'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface MCPDropdownSelectorProps {
  workspaceId: string
  className?: string
}

export function MCPDropdownSelector({
  workspaceId,
  className,
}: MCPDropdownSelectorProps) {
  const { isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>(
    'below',
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    data: sourcesData,
    loading: isLoading,
    mutate: mutateSources,
  } = useGetMcpSources(workspaceId)
  const availableServers = sourcesData?.availableServers ?? []
  const selectedServers = new Set<string>(sourcesData?.enabledInWorkspace ?? [])

  const [pendingToggle, setPendingToggle] = useState<{
    name: string
    enable: boolean
  } | null>(null)
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
      .catch(() => mutateSources())
      .finally(() => setPendingToggle(null))
  }, [pendingToggle])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Calculate dropdown position based on available space
  useLayoutEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const menuHeight = 400 // Max height of dropdown

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('above')
      } else {
        setDropdownPosition('below')
      }
    }
  }, [isOpen])

  const handleToggleServer = (serverName: string, checked: boolean) => {
    setPendingToggle({ name: serverName, enable: checked })
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Settings Button - smaller, gray */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'rounded-full p-1.5 transition-all',
          isDark
            ? 'text-white/40 hover:bg-white/5 hover:text-white/60'
            : 'text-black/40 hover:bg-black/5 hover:text-black/60',
        )}
        title='MCP Settings'>
        <RiSettings3Line size={16} />
      </button>

      {/* Dropdown Menu - cleaner positioning */}
      {isOpen && (
        <div className='absolute right-0 top-full z-50 mt-1'>
          <m.div
            ref={menuRef}
            className={cn(
              'w-64',
              'overflow-hidden rounded-2xl',
              'border shadow-xl',
              isDark
                ? 'border-white/10 bg-[#1d1d1f]'
                : 'border-[#d2d2d7]/30 bg-white',
            )}
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 28,
              mass: 0.8,
            }}>
            {/* Header */}
            <div
              className={cn(
                'border-b px-3 py-2',
                isDark ? 'border-white/10' : 'border-[#e5e5e7]/20',
              )}>
              <div className='flex items-center justify-between'>
                <div>
                  <h3
                    className={cn(
                      'text-sm font-semibold',
                      isDark ? 'text-white' : 'text-[#1d1d1f]',
                    )}>
                    MCP Connectors
                  </h3>
                  <p
                    className={cn(
                      'mt-0.5 text-xs',
                      isDark ? 'text-white/60' : 'text-[#86868b]',
                    )}>
                    {selectedServers.size} active
                  </p>
                </div>
                <button
                  onClick={() => mutateSources()}
                  disabled={isLoading}
                  className={cn(
                    'rounded-lg p-1.5 transition-colors',
                    isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-black/[0.04]',
                    isLoading && 'pointer-events-none opacity-50',
                  )}>
                  <RiRefreshLine
                    className={cn(
                      'h-3.5 w-3.5',
                      isDark ? 'text-white/60' : 'text-black/60',
                      isLoading && 'animate-spin',
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Server List */}
            <div className='max-h-[320px] overflow-y-auto px-2 py-1'>
              {isLoading ? (
                <div className='flex items-center justify-center py-6'>
                  <RiRefreshLine
                    className={cn(
                      'h-5 w-5 animate-spin',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}
                  />
                </div>
              ) : availableServers.length === 0 ? (
                <div className='py-6 text-center'>
                  <p
                    className={cn(
                      'text-xs',
                      isDark ? 'text-white/60' : 'text-[#86868b]',
                    )}>
                    No MCP connectors available
                  </p>
                </div>
              ) : (
                <div className='space-y-0.5'>
                  {availableServers.map((server) => (
                    <div
                      key={server.name}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                        isDark
                          ? 'hover:bg-white/[0.04]'
                          : 'hover:bg-black/[0.02]',
                      )}>
                      <Toggle
                        checked={server.enabledInWorkspace}
                        onChange={(checked) =>
                          handleToggleServer(server.name, checked)
                        }
                        disabled={server.enabled === false}
                        size='small'
                        isDark={isDark}
                        className='flex-shrink-0'
                      />
                      <span
                        className={cn(
                          'flex-1 truncate text-xs font-medium',
                          isDark ? 'text-white/80' : 'text-black/80',
                          server.enabled === false && 'opacity-50',
                        )}>
                        {server.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </m.div>
        </div>
      )}
    </div>
  )
}
