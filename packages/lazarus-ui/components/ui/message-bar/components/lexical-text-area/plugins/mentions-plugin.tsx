'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  MenuTextMatch,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { RiFileLine, RiFolderLine, RiMessageLine } from '@remixicon/react'
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from 'lexical'
import * as m from 'motion/react-m'
import Image from 'next/image'
import React, {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as ReactDOM from 'react-dom'

import { useWorkspace } from '@/hooks/core/use-workspace'
import type { WorkspaceFile } from '@/hooks/features/workspace/types'
import { useClickAway } from '@/hooks/ui/interaction/use-click-away'
import { useWorkspaceFileSearch } from '@/hooks/workspace/use-workspace-file-search'
import { useWorkspaceFiles } from '@/hooks/workspace/use-workspace-files'
import { formatRelativeTime } from '@/lib/date-formatter'
import { getFileTypeIconComponent } from '@/lib/file-icons'
import { cn } from '@/lib/utils'
import { App, getAppIcon } from '@/model/app'
import { File, createFile } from '@/model/file'
import { Item, isItemOfType } from '@/model/item'
import { itemToTaggedItem, useTagStore } from '@/store/tag-store'

import { $createMentionNode } from '../nodes/mention-node'

// Animation presets from tag-button
const ENTRY_TRANSITION = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
  mass: 0.8,
}

const menuItemVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.95 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...ENTRY_TRANSITION,
      delay: custom * 0.025,
    },
  }),
}

const containerVariants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...ENTRY_TRANSITION,
      staggerChildren: 0.025,
      delayChildren: 0.02,
    },
  },
}

const innerContentVariants = {
  hidden: { opacity: 0, y: -5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...ENTRY_TRANSITION,
      delay: 0.04,
    },
  },
}

const buttonHoverVariants = {
  initial: { scale: 1 },
  hover: { scale: 1 },
  tap: { scale: 0.98 },
}

// At the top of the file, add scrollbar styles
const scrollbarStyles = `
  .mentions-scrollable {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }
  .mentions-scrollable::-webkit-scrollbar {
    width: 4px;
  }
  .mentions-scrollable::-webkit-scrollbar-track {
    background: transparent;
  }
  .mentions-scrollable::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  .mentions-scrollable::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`

// Get the appropriate icon for an item based on its type
// Mirrors tag-button.tsx getItemIcon for consistency
const getItemIcon = (item: Item): React.ReactNode | string => {
  if (item.metadata?.isDirectory) {
    return <RiFolderLine className='h-3.5 w-3.5 text-[#F5A623]' />
  }
  if (isItemOfType<File>(item, 'file')) {
    return getFileTypeIconComponent(item.fileType, 'h-3.5 w-3.5')
  } else if (isItemOfType<App>(item, 'app')) {
    return getAppIcon(item.app_type as any)
  } else if (item.type === 'conversation') {
    return <RiMessageLine className='h-3.5 w-3.5 text-[#0098FC]' />
  }
  return <RiFileLine className='h-3.5 w-3.5 text-black/60' />
}

const PUNCTUATION =
  '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;'
const TRIGGERS = ['@'].join('')

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = '[^' + TRIGGERS + PUNCTUATION + '\\s]'

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
  '(?:' +
  '\\.[ |$]|' + // E.g. "r. " in "Mr. Smith"
  ' |' + // E.g. " " in "Josh Duck"
  '[' +
  PUNCTUATION +
  ']|' + // E.g. "-' in "Salier-Hellendag"
  ')'

const LENGTH_LIMIT = 75

const AtSignMentionsRegex = new RegExp(
  '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    VALID_JOINS +
    '){0,' +
    LENGTH_LIMIT +
    '})' +
    ')$',
)

// At most, 10 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 10

function checkForAtSignMentions(
  text: string,
  minMatchLength: number,
): MenuTextMatch | null {
  const match = AtSignMentionsRegex.exec(text)

  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1]

    const matchingString = match[3]
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      }
    }
  }
  return null
}

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
  return checkForAtSignMentions(text, 0)
}

class MentionTypeaheadOption extends MenuOption {
  item: Item
  picture: ReactElement

  constructor(item: Item, picture: ReactElement) {
    super(item.name || (item as any).title || 'Item')
    this.item = item
    this.picture = picture
  }
}

interface RecentItemButtonProps {
  item: Item
  onSelect: () => void
  index: number
  isSelected: boolean
  isDirectory?: boolean
}

function RecentItemButton({
  item,
  onSelect,
  index,
  isSelected,
  isDirectory,
}: RecentItemButtonProps) {
  return (
    <m.div
      custom={index}
      variants={menuItemVariants}
      initial='hidden'
      animate='visible'>
      <m.button
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
          'cursor-pointer',
          isSelected
            ? 'bg-black/[0.04] dark:bg-white/[0.06]'
            : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
          'text-[#1d1d1f] dark:text-white',
        )}
        variants={buttonHoverVariants}
        initial='initial'
        whileHover='hover'
        whileTap='tap'>
        <div
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
            item.isTagged
              ? 'bg-[#0098FC]/10'
              : isDirectory
                ? 'bg-[#F5A623]/10 dark:bg-[#F5A623]/15'
                : 'bg-[#fafafa] dark:bg-white/[0.08]',
          )}>
          {(() => {
            const icon = getItemIcon(item)
            if (typeof icon === 'string') {
              return (
                <Image
                  src={icon}
                  alt={item.name || 'Item'}
                  width={14}
                  height={14}
                  className='h-3.5 w-3.5'
                />
              )
            }
            return icon
          })()}
        </div>
        <div className='flex min-w-0 flex-1 items-center justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium leading-tight'>
              {item.name || (item as any).title || 'Untitled'}
            </div>
            {!isDirectory && (
              <div className='truncate text-xs text-[#86868b] dark:text-white/50'>
                {formatRelativeTime(item.updatedAt)}
              </div>
            )}
          </div>
          {isDirectory ? (
            <svg
              width='14'
              height='14'
              viewBox='0 0 14 14'
              fill='none'
              className='ml-2 flex-shrink-0 text-black/30 dark:text-white/30'>
              <path
                d='M5.5 3.5L9 7L5.5 10.5'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          ) : (
            item.isTagged && (
              <svg
                width='14'
                height='14'
                viewBox='0 0 14 14'
                fill='none'
                className='ml-2 flex-shrink-0 text-[#0098FC]'>
                <path
                  d='M2.5 7L5.5 10L11.5 3'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            )
          )}
        </div>
      </m.button>
    </m.div>
  )
}

function workspaceFilesToItems(files: WorkspaceFile[]): Item[] {
  return files.map((f) =>
    createFile({
      id: f.path,
      name: f.displayName || f.name,
      path: f.path,
      size: f.size,
      updatedAt: f.modifiedAt,
      metadata: { isDirectory: f.type === 'directory' },
    }),
  )
}

export default function MentionsPlugin(): ReactElement | null {
  const [editor] = useLexicalComposerContext()
  const [queryString, setQueryString] = useState<string | null>(null)
  const isSelectingRef = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeMenuRef = useRef<(() => void) | null>(null)

  // Use new Zustand tag store
  const addTag = useTagStore((state) => state.addTag)
  const taggedItems = useTagStore((state) => state.taggedItems)

  // Fetch workspace files from backend API (same source as tag-button)
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const { sorted: browseFiles } = useWorkspaceFiles(workspaceId)
  const { results: searchFiles, isSearching } = useWorkspaceFileSearch(
    workspaceId,
    queryString || '',
  )

  const browseItems = useMemo(
    () => workspaceFilesToItems(browseFiles),
    [browseFiles],
  )
  const searchItemsList = useMemo(
    () => workspaceFilesToItems(searchFiles),
    [searchFiles],
  )

  const searchResults = useMemo(() => {
    if (queryString === null) return []
    const taggedIds = new Set(taggedItems.map((t) => t.id))

    // When backend search is active (2+ chars, debounce elapsed), use API results.
    // Otherwise fall back to browseItems with client-side filtering so that
    // typing 1 char or waiting for the debounce still feels responsive.
    const source = isSearching ? searchItemsList : browseItems
    const query = (queryString || '').toLowerCase()

    const results = source
      .filter((item) => {
        if (taggedIds.has(item.id)) return false
        // Client-side name filter when not using backend search
        if (query && !isSearching) {
          const name = (item.name || '').toLowerCase()
          return name.includes(query)
        }
        return true
      })
      .slice(0, SUGGESTION_LIST_LENGTH_LIMIT)
    return results
  }, [queryString, isSearching, searchItemsList, browseItems, taggedItems])

  // Track if menu should be open based on search results
  const shouldShowMenu = searchResults.length > 0

  // Set global flag for mentions menu state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__mentionsMenuOpen =
        shouldShowMenu && queryString !== null
    }
    return () => {
      if (typeof window !== 'undefined') {
        ;(window as any).__mentionsMenuOpen = false
      }
    }
  }, [shouldShowMenu, queryString])

  // Use click away hook
  useClickAway({
    refs: menuRef as React.RefObject<HTMLElement>,
    handler: () => {
      closeMenuRef.current?.()
    },
    enabled: shouldShowMenu,
  })

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  })

  const options = useMemo(
    () =>
      searchResults.map(
        (item) =>
          new MentionTypeaheadOption(
            item,
            (
              <div className='flex h-4 w-4 items-center justify-center rounded-full bg-white p-0.5 shadow-sm'>
                {(() => {
                  const icon = getItemIcon(item)
                  if (typeof icon === 'string') {
                    return (
                      <Image
                        src={icon}
                        alt={item.name || 'Item'}
                        width={12}
                        height={12}
                        className='h-3 w-3'
                      />
                    )
                  }
                  return icon
                })()}
              </div>
            ),
          ),
      ),
    [searchResults],
  )

  const onSelectOption = useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      // Prevent double execution
      if (isSelectingRef.current) return
      isSelectingRef.current = true

      // Add item to new Zustand tag store (outside of Lexical update)
      const taggedItem = itemToTaggedItem(selectedOption.item)
      console.log('[MentionsPlugin] Adding tag to store:', taggedItem)
      addTag(taggedItem)

      // Get item display name for UI
      const itemName =
        selectedOption.item.name || (selectedOption.item as any).title || 'Item'

      editor.update(() => {
        // Create compact mention format: @{type:id}
        // The display name is stored in the tag store, no need to duplicate in text
        const structuredMention = `{${selectedOption.item.type}:${selectedOption.item.id}}`

        // Create mention node - displays @name to user, serializes as @{type:id}
        const mentionNode = $createMentionNode(
          structuredMention,
          `@${itemName}`,
        )

        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode)

          // Add a space after the mention
          const spaceNode = $createTextNode(' ')
          mentionNode.insertAfter(spaceNode)

          // Move cursor after the space
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            spaceNode.select()
          }
        }
      })

      // Close menu and focus editor
      closeMenu()

      // Reset the flag after a short delay
      setTimeout(() => {
        isSelectingRef.current = false
        editor.focus()
      }, 100)
    },
    [editor, addTag],
  )

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const slashMatch = checkForSlashTriggerMatch(text, editor)
      if (slashMatch !== null) {
        return null
      }
      return getPossibleQueryMatch(text)
    },
    [checkForSlashTriggerMatch, editor],
  )

  // Store the close menu function when it changes
  useEffect(() => {
    // Add scrollbar styles
    const styleEl = document.createElement('style')
    styleEl.textContent = scrollbarStyles
    document.head.appendChild(styleEl)

    return () => {
      closeMenuRef.current = null
      styleEl.remove()
    }
  }, [])

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        {
          selectedIndex,
          selectOptionAndCleanUp,
          setHighlightedIndex: _setHighlightedIndex,
        },
      ) => {
        if (anchorElementRef.current && searchResults.length > 0) {
          // Store the close function via ref (safe during render)
          if (!closeMenuRef.current) {
            closeMenuRef.current = () => {
              const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true,
              })
              editor.getRootElement()?.dispatchEvent(escapeEvent)
            }
          }

          return ReactDOM.createPortal(
            <div ref={menuRef}>
              <m.div
                className={cn(
                  'absolute left-0 z-[9999] w-[240px]',
                  'overflow-hidden rounded-2xl',
                  'border border-[#d2d2d7]/30 bg-white shadow-xl',
                  'dark:border-white/10 dark:bg-[#1d1d1f]',
                )}
                style={{
                  left: '0',
                  bottom: 'calc(100% + 40px)', // Position further above to not cover text
                }}
                variants={containerVariants}
                initial='hidden'
                animate='visible'
                role='menu'
                aria-label='Typeahead menu'>
                <m.div
                  variants={innerContentVariants}
                  className='border-b border-[#e5e5e7]/20 px-3 py-2 dark:border-white/10'>
                  <h3 className='text-sm font-semibold text-[#1d1d1f] dark:text-white'>
                    Add context
                  </h3>
                </m.div>

                <div className='max-h-[280px] overflow-y-auto'>
                  <div className='py-1'>
                    {/* Items list - search happens automatically from typing after @ */}
                    {searchResults.length > 0 ? (
                      <div className='space-y-0'>
                        {searchResults.map((item, idx) => (
                          <RecentItemButton
                            key={`mention-${item.id}-${idx}`}
                            item={item}
                            onSelect={() => {
                              selectOptionAndCleanUp(options[idx])
                            }}
                            index={idx}
                            isSelected={selectedIndex === idx}
                            isDirectory={!!item.metadata?.isDirectory}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className='px-3 py-4 text-center'>
                        <p className='text-sm text-[#86868b] dark:text-white/50'>
                          {queryString
                            ? `No items matching "${queryString}"`
                            : 'No items found'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </m.div>
            </div>,
            anchorElementRef.current,
          )
        }
        return null
      }}
    />
  )
}
