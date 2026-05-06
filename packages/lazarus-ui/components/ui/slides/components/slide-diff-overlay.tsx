import { cn } from '@/lib/utils'

import type { SlideChange } from '../types/diff'

interface SlideDiffOverlayProps {
  changes: SlideChange[]
  className?: string
}

export function SlideDiffOverlay({
  changes,
  className,
}: SlideDiffOverlayProps) {
  // Group changes by type for better visualization
  const groupedChanges = changes.reduce(
    (acc, change) => {
      const category = getChangeCategory(change.path)
      if (!acc[category]) acc[category] = []
      acc[category].push(change)
      return acc
    },
    {} as Record<string, SlideChange[]>,
  )

  return (
    <div className={cn('space-y-2', className)}>
      {Object.entries(groupedChanges).map(([category, categoryChanges]) => (
        <div
          key={category}
          className='rounded-lg bg-black/80 p-3 backdrop-blur-sm'>
          <h5 className='mb-1.5 text-xs font-medium text-white opacity-80'>
            {category} Changes
          </h5>
          <div className='space-y-1'>
            {categoryChanges.map((change, index) => (
              <DiffItem key={index} change={change} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DiffItem({ change }: { change: SlideChange }) {
  return (
    <div className='flex items-start gap-2'>
      <div
        className={cn(
          'mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full',
          change.type === 'added' && 'bg-green-400',
          change.type === 'removed' && 'bg-red-400',
          change.type === 'modified' && 'bg-yellow-400',
        )}
      />
      <div className='text-xs leading-relaxed text-white/90'>
        <span className='font-medium'>{formatPath(change.path)}:</span>{' '}
        {renderChangeValue(change)}
      </div>
    </div>
  )
}

function renderChangeValue(change: SlideChange) {
  if (change.type === 'modified' && change.oldValue && change.newValue) {
    // For text content, show a nice diff
    if (
      typeof change.oldValue === 'string' &&
      typeof change.newValue === 'string'
    ) {
      return (
        <span>
          <span className='text-red-400 line-through'>
            {truncate(change.oldValue, 40)}
          </span>
          <span className='mx-1 text-white/50'>→</span>
          <span className='text-green-400'>
            {truncate(change.newValue, 40)}
          </span>
        </span>
      )
    }
    // For other types, just show the change type
    return <span className='text-yellow-400'>Modified</span>
  }

  if (change.type === 'added') {
    return (
      <span className='text-green-400'>
        Added {formatValue(change.newValue)}
      </span>
    )
  }

  if (change.type === 'removed') {
    return (
      <span className='text-red-400'>
        Removed {formatValue(change.oldValue)}
      </span>
    )
  }

  return null
}

function formatValue(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return `"${truncate(value, 30)}"`
  if (typeof value === 'object') return '(complex value)'
  return String(value)
}

function getChangeCategory(path: string): string {
  if (path.includes('content')) return 'Content'
  if (path === 'title' || path === 'subtitle') return 'Text'
  if (path === 'layout' || path === 'background' || path === 'transition')
    return 'Style'
  if (path === 'position') return 'Order'
  return 'Other'
}

function formatPath(path: string): string {
  const pathParts = path.split(/[\[\].]/).filter(Boolean)
  const lastPart = pathParts[pathParts.length - 1]

  // Capitalize and make more readable
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}
