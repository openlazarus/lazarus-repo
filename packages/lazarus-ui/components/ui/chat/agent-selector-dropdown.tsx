'use client'

import { RiAddCircleLine, RiCheckLine, RiUser6Fill } from '@remixicon/react'
import { m } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useWorkspaceAgents } from '@/hooks/features/agents/use-workspace-agents'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

interface AgentSelectorDropdownProps {
  workspaceId: string | null
  userId: string | null
  selectedAgentId?: string | null
  onAgentSelect: (agentId: string | null, agentName: string) => void
  onNewChat?: () => void
  className?: string
}

export function AgentSelectorDropdown({
  workspaceId,
  userId,
  selectedAgentId,
  onAgentSelect,
  onNewChat,
  className,
}: AgentSelectorDropdownProps) {
  const { isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const { agents, loading } = useWorkspaceAgents(workspaceId, userId)
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>(
    'below',
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Sort agents: Lazarus first (as default), then others alphabetically
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.id === 'lazarus') return -1
    if (b.id === 'lazarus') return 1
    return a.name.localeCompare(b.name)
  })

  // Get selected agent
  const selectedAgent = sortedAgents.find((a) => a.id === selectedAgentId)
  const selectedAgentName = selectedAgent?.name || 'Lazarus'

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
      const menuHeight = 320

      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('above')
      } else {
        setDropdownPosition('below')
      }
    }
  }, [isOpen])

  const handleAgentClick = (agentId: string | null, agentName: string) => {
    onAgentSelect(agentId, agentName)
    setIsOpen(false)
  }

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat()
    } else {
      // Default behavior: create new chat with current agent
      onAgentSelect(selectedAgentId || null, selectedAgentName)
    }
  }

  return (
    <div
      className={cn('relative flex items-center gap-1', className)}
      ref={dropdownRef}>
      {/* New chat button - circled plus in Lazarus blue */}
      <button
        onClick={handleNewChatClick}
        className={cn(
          'rounded-full p-1.5 transition-all',
          'text-[hsl(var(--lazarus-blue))] hover:bg-[hsl(var(--lazarus-blue))]/10',
        )}
        title='New chat'>
        <RiAddCircleLine size={18} />
      </button>

      {/* Agent selector trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-all',
          isDark
            ? 'text-white/60 hover:text-white/80'
            : 'text-black/60 hover:text-black/80',
          isOpen &&
            (isDark ? 'bg-white/5 text-white/80' : 'bg-black/5 text-black/80'),
        )}
        title='Select agent'>
        <RiUser6Fill size={14} />
        <span className='max-w-[80px] truncate'>{selectedAgentName}</span>
        <svg
          width='10'
          height='10'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className={cn(
            'transition-transform duration-200',
            isOpen && 'rotate-180',
          )}>
          <path d='m6 9 6 6 6-6' />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1',
            dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full',
            'right-0',
          )}>
          <m.div
            ref={menuRef}
            className={cn(
              'w-56',
              'overflow-hidden rounded-xl',
              'border shadow-lg',
              isDark
                ? 'border-white/10 bg-[#1d1d1f]'
                : 'border-black/5 bg-white',
            )}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}>
            {/* Header */}
            <div
              className={cn(
                'border-b px-3 py-2',
                isDark ? 'border-white/5' : 'border-black/5',
              )}>
              <p
                className={cn(
                  'text-[11px] font-medium uppercase tracking-wide',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                Select agent
              </p>
            </div>

            {/* Agent list */}
            <div className='max-h-[280px] overflow-y-auto py-1'>
              {loading ? (
                <div className='flex items-center justify-center py-6'>
                  <div
                    className={cn(
                      'h-4 w-4 animate-spin rounded-full border-2 border-t-transparent',
                      isDark ? 'border-white/20' : 'border-black/20',
                    )}
                  />
                </div>
              ) : (
                sortedAgents.map((agent) => {
                  const agentId = agent.id
                  const agentName = agent.name
                  const isSelected = agentId === selectedAgentId
                  const isLazarus = agentId === 'lazarus'
                  const description =
                    'description' in agent ? agent.description : undefined

                  return (
                    <button
                      key={agentId || 'default'}
                      onClick={() => handleAgentClick(agentId, agentName)}
                      className={cn(
                        'group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                        isDark
                          ? 'hover:bg-white/[0.04]'
                          : 'hover:bg-black/[0.02]',
                      )}>
                      {/* Agent icon */}
                      <div
                        className={cn(
                          'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                          isDark
                            ? 'bg-white/5 text-white/60'
                            : 'bg-black/[0.03] text-black/50',
                        )}>
                        <RiUser6Fill size={14} />
                      </div>

                      {/* Agent info */}
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-1.5'>
                          <span
                            className={cn(
                              'truncate text-[13px] font-medium',
                              isDark ? 'text-white/90' : 'text-black/90',
                            )}>
                            {agentName}
                          </span>
                          {isLazarus && (
                            <span
                              className={cn(
                                'rounded px-1 py-0.5 text-[9px] font-medium',
                                'bg-[hsl(var(--lazarus-blue))]/10 text-[hsl(var(--lazarus-blue))]',
                              )}>
                              Default
                            </span>
                          )}
                        </div>
                        {description && (
                          <p
                            className={cn(
                              'truncate text-[11px]',
                              isDark ? 'text-white/40' : 'text-black/40',
                            )}>
                            {description}
                          </p>
                        )}
                      </div>

                      {/* Selection check */}
                      {isSelected && (
                        <RiCheckLine
                          size={14}
                          className='flex-shrink-0 text-[hsl(var(--lazarus-blue))]'
                        />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </m.div>
        </div>
      )}
    </div>
  )
}
