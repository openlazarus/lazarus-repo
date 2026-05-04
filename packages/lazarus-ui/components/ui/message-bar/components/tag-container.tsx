'use client'

import {
  RiFileLine,
  RiFolderLine,
  RiHistoryLine,
  RiMessageLine,
  RiPlugLine,
  RiUser6Fill,
} from '@remixicon/react'
import { memo, useRef, useState } from 'react'

import { getFileTypeIconComponent } from '@/lib/file-icons'
import { FileType } from '@/model/file'
import { TaggedItem, useTagActions, useTaggedItems } from '@/store/tag-store'

// CSS to hide scrollbars across browsers
const scrollbarHideStyles = `
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`

// X icon for removing tags
const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'>
    <line x1='18' y1='6' x2='6' y2='18'></line>
    <line x1='6' y1='6' x2='18' y2='18'></line>
  </svg>
)

// Chevron icon for expand/collapse
const ChevronIcon = ({
  isExpanded,
  size = 16,
}: {
  isExpanded: boolean
  size?: number
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
    <polyline points='6,9 12,15 18,9'></polyline>
  </svg>
)

// Get the appropriate icon for a tagged item
const getTaggedItemIcon = (item: TaggedItem): React.ReactNode => {
  const iconClass = 'h-3.5 w-3.5'

  switch (item.type) {
    case 'file':
      // Use file type icon component for files
      if (item.fileType) {
        return getFileTypeIconComponent(item.fileType as FileType, iconClass)
      }
      return (
        <RiFileLine
          className={`${iconClass} text-black/60 dark:text-white/60`}
        />
      )

    case 'directory':
      return <RiFolderLine className={`${iconClass} text-[#0098FC]`} />

    case 'agent':
      return <RiUser6Fill className={`${iconClass} text-[#0098FC]`} />

    case 'source':
      return <RiPlugLine className={`${iconClass} text-[#0098FC]`} />

    case 'conversation':
      return <RiMessageLine className={`${iconClass} text-[#0098FC]`} />

    case 'activity':
      return <RiHistoryLine className={`${iconClass} text-[#0098FC]`} />

    default:
      return (
        <RiFileLine
          className={`${iconClass} text-black/60 dark:text-white/60`}
        />
      )
  }
}

interface TagItemProps {
  item: TaggedItem
  onRemove: (id: string) => void
}

// Tag item component with proper styling
const TagItem = memo(({ item, onRemove }: TagItemProps) => {
  return (
    <div className='flex items-center gap-1.5 rounded-md bg-[#0098FC]/10 px-2 py-1'>
      {getTaggedItemIcon(item)}
      <span className='max-w-[120px] truncate text-[13px] font-medium text-[#0098FC]'>
        {item.name}
      </span>
      <button
        onClick={() => onRemove(item.id)}
        className='text-[#0098FC]/60 transition-colors hover:text-[#0098FC]'>
        <XIcon size={12} />
      </button>
    </div>
  )
})

TagItem.displayName = 'TagItem'

// Tag container positioned to the left with expand/collapse
// Accepts children (e.g. attachment pills) to render inline in the same row
export const TagContainer = memo(
  ({ children }: { children?: React.ReactNode }) => {
    const taggedItems = useTaggedItems()
    const { removeTag } = useTagActions()
    const containerRef = useRef<HTMLDivElement>(null)
    const [isExpanded, setIsExpanded] = useState(false)

    const hasTags = taggedItems && taggedItems.length > 0

    // If no tagged items and no children, don't render anything
    if (!hasTags && !children) {
      return null
    }

    const maxVisibleTags = 2
    const hasMoreTags = hasTags && taggedItems.length > maxVisibleTags
    const visibleTags = hasTags
      ? isExpanded
        ? taggedItems
        : taggedItems.slice(0, maxVisibleTags)
      : []
    const hiddenCount = hasTags ? taggedItems.length - maxVisibleTags : 0

    return (
      <div className='relative w-full min-w-0'>
        <style>{scrollbarHideStyles}</style>
        <div ref={containerRef} className='relative'>
          {/* Tags + inline children in one flex-wrap row */}
          <div className='flex flex-wrap items-center gap-2 overflow-hidden'>
            {visibleTags.map((item) => (
              <TagItem
                key={`tag-${item.id}`}
                item={item}
                onRemove={removeTag}
              />
            ))}

            {/* Inline children (e.g. attachment pills) */}
            {children}

            {/* Expand/collapse button when there are more tags */}
            {hasMoreTags && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className='flex flex-shrink-0 items-center gap-0.5 rounded-md bg-black/[0.02] px-2 py-1 text-[13px] font-medium text-black/50 transition-all hover:bg-black/[0.04] hover:text-black/70 dark:bg-white/[0.04] dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white/70'>
                {isExpanded ? (
                  <>
                    <span>Show less</span>
                    <ChevronIcon isExpanded={true} size={12} />
                  </>
                ) : (
                  <>
                    <span>+{hiddenCount}</span>
                    <ChevronIcon isExpanded={false} size={12} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  },
)

TagContainer.displayName = 'TagContainer'
