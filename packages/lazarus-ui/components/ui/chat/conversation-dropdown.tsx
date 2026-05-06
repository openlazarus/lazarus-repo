'use client'

import { RiHistoryLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'
import type { ConversationMetadata } from '@/model/conversation'

import { ConversationListItem } from './conversation-list-item'

export interface ConversationDropdownProps {
  conversations: ConversationMetadata[]
  currentConversationId?: string | null
  onSelectConversation: (conversationId: string | null) => void
  onConversationDeleted: (conversationId: string) => void
  className?: string
}

export const ConversationDropdown = memo<ConversationDropdownProps>(
  ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onConversationDeleted,
    className,
  }) => {
    const { isDark } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const dropdownRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    const currentConversation = conversations.find(
      (c) => c.id === currentConversationId,
    )

    // Handle clicks outside dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
          setExpandedId(null)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isOpen])

    const handleToggle = useCallback(() => {
      setIsOpen((prev) => !prev)
      if (isOpen) {
        setExpandedId(null)
        setSearchTerm('')
      }
    }, [isOpen])

    const handleNewConversation = useCallback(() => {
      onSelectConversation(null)
      setIsOpen(false)
      setExpandedId(null)
    }, [onSelectConversation])

    const handleSelectConversation = useCallback(
      (conversationId: string) => {
        onSelectConversation(conversationId)
        setIsOpen(false)
        setExpandedId(null)
      },
      [onSelectConversation],
    )

    const handleToggleExpand = useCallback((conversationId: string) => {
      setExpandedId((prev) => (prev === conversationId ? null : conversationId))
    }, [])

    // Filter conversations based on search term
    const filteredConversations = conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    return (
      <div className={cn('relative', className)}>
        {/* Trigger button - smaller, gray icon */}
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className={cn(
            'rounded-full p-1.5 transition-all',
            isDark
              ? 'text-white/40 hover:bg-white/5 hover:text-white/60'
              : 'text-black/40 hover:bg-black/5 hover:text-black/60',
          )}
          title='Conversation history'>
          <RiHistoryLine size={16} />
        </button>

        {/* Dropdown panel - cleaner positioning */}
        {isOpen && (
          <div className='absolute right-0 top-full z-50 mt-1'>
            <m.div
              ref={dropdownRef}
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
                <h3
                  className={cn(
                    'text-sm font-semibold',
                    isDark ? 'text-white' : 'text-[#1d1d1f]',
                  )}>
                  Conversations
                </h3>
              </div>

              <div className='max-h-[320px] overflow-y-auto'>
                <div className='py-1'>
                  {/* Search input */}
                  <div className='px-3 pb-2'>
                    <div className='relative'>
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 20 20'
                        fill='none'
                        className={cn(
                          'absolute left-2 top-1/2 -translate-y-1/2',
                          isDark ? 'text-white/50' : 'text-[#86868b]',
                        )}>
                        <path
                          d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                        <path
                          d='M19 19L14.65 14.65'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                      <input
                        type='text'
                        placeholder='Search conversations...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                          'h-7 w-full rounded-md pl-7 pr-2 text-xs',
                          isDark ? 'bg-white/[0.08]' : 'bg-[#f5f5f7]',
                          'border border-transparent',
                          isDark
                            ? 'placeholder:text-white/50'
                            : 'placeholder:text-[#86868b]',
                          isDark ? 'text-white' : 'text-[#1d1d1f]',
                          'focus:outline-none focus:ring-1',
                          isDark
                            ? 'focus:ring-white/20'
                            : 'focus:ring-[#0098FC]/30',
                          'transition-all duration-200',
                        )}
                      />
                    </div>
                  </div>

                  {/* New conversation button */}
                  <m.button
                    onClick={handleNewConversation}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                      'cursor-pointer',
                      isDark
                        ? 'hover:bg-white/[0.06]'
                        : 'hover:bg-black/[0.04]',
                    )}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.98 }}>
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full',
                        'bg-[#0098FC]/10',
                      )}>
                      <span className='text-[10px] font-medium text-[#0098FC]'>
                        +
                      </span>
                    </div>
                    <div className='flex-1'>
                      <div className='text-[14px] font-medium leading-tight'>
                        New Conversation
                      </div>
                    </div>
                  </m.button>

                  {/* Divider */}
                  {filteredConversations.length > 0 && (
                    <div
                      className={cn(
                        'mx-2 my-1 border-t',
                        isDark ? 'border-white/10' : 'border-black/10',
                      )}
                    />
                  )}

                  {/* Conversations list */}
                  {filteredConversations.length > 0 ? (
                    <div className='space-y-0'>
                      {filteredConversations.map((conversation) => (
                        <ConversationListItem
                          key={conversation.id}
                          conversation={conversation}
                          isSelected={conversation.id === currentConversationId}
                          isExpanded={expandedId === conversation.id}
                          onToggleExpand={() =>
                            handleToggleExpand(conversation.id)
                          }
                          onSelect={handleSelectConversation}
                          onDeleted={onConversationDeleted}
                        />
                      ))}
                    </div>
                  ) : conversations.length > 0 ? (
                    <div className='px-3 py-4 text-center'>
                      <p
                        className={cn(
                          'text-xs',
                          isDark ? 'text-white/50' : 'text-[#86868b]',
                        )}>
                        No results found
                      </p>
                    </div>
                  ) : (
                    <div className='px-3 py-8 text-center'>
                      <RiHistoryLine
                        size={24}
                        className={cn(
                          'mx-auto mb-2',
                          isDark ? 'text-white/20' : 'text-black/20',
                        )}
                      />
                      <p
                        className={cn(
                          'text-xs',
                          isDark ? 'text-white/50' : 'text-[#86868b]',
                        )}>
                        No conversations yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          </div>
        )}
      </div>
    )
  },
)

ConversationDropdown.displayName = 'ConversationDropdown'
