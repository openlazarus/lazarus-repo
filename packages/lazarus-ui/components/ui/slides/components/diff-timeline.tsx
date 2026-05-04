import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiFilter3Line,
  RiPauseLine,
  RiPlayLine,
} from '@remixicon/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type {
  ChangeType,
  DiffStatistics,
  DiffTimelineEntry,
} from '../types/diff'

interface DiffTimelineProps {
  timeline: DiffTimelineEntry[]
  currentIndex: number
  statistics: DiffStatistics | null
  isPlaying: boolean
  playbackSpeed: number
  filteredTypes: ChangeType[]
  onNavigate: (index: number) => void
  onTogglePlayback: () => void
  onSetPlaybackSpeed: (speed: number) => void
  onToggleChangeType: (type: ChangeType) => void
  onClose?: () => void
}

export function DiffTimeline({
  timeline,
  currentIndex,
  statistics,
  isPlaying,
  playbackSpeed,
  filteredTypes,
  onNavigate,
  onTogglePlayback,
  onSetPlaybackSpeed,
  onToggleChangeType,
  onClose,
}: DiffTimelineProps) {
  const [showFilters, setShowFilters] = useState(false)
  const currentEntry = timeline[currentIndex]

  const changeTypeColors: Record<ChangeType, string> = {
    content: 'bg-blue-500',
    style: 'bg-purple-500',
    layout: 'bg-green-500',
    metadata: 'bg-gray-500',
    reorder: 'bg-orange-500',
  }

  const changeTypeLabels: Record<ChangeType, string> = {
    content: 'Content',
    style: 'Style',
    layout: 'Layout',
    metadata: 'Metadata',
    reorder: 'Reorder',
  }

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg'>
      {/* Timeline bar */}
      <div className='relative h-2 bg-gray-100'>
        {timeline.map((entry, index) => (
          <button
            key={entry.id}
            onClick={() => onNavigate(index)}
            className={cn(
              'absolute bottom-0 top-0 w-1 transition-all',
              changeTypeColors[entry.change.changeType],
              index === currentIndex && 'z-10 w-2',
            )}
            style={{
              left: `${(index / (timeline.length - 1)) * 100}%`,
              opacity: index === currentIndex ? 1 : 0.6,
            }}
            title={entry.change.description}
          />
        ))}
      </div>

      <div className='p-4'>
        <div className='flex items-center justify-between gap-4'>
          {/* Navigation controls */}
          <div className='flex items-center gap-2'>
            <Button
              size='small'
              variant='outline'
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}>
              <RiArrowLeftSLine className='h-4 w-4' />
            </Button>

            <Button size='small' variant='outline' onClick={onTogglePlayback}>
              {isPlaying ? (
                <RiPauseLine className='h-4 w-4' />
              ) : (
                <RiPlayLine className='h-4 w-4' />
              )}
            </Button>

            <Button
              size='small'
              variant='outline'
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex === timeline.length - 1}>
              <RiArrowRightSLine className='h-4 w-4' />
            </Button>

            <select
              value={playbackSpeed}
              onChange={(e) => onSetPlaybackSpeed(Number(e.target.value))}
              className='rounded border px-2 py-1 text-sm'>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>

          {/* Current change info */}
          <div className='flex-1 text-center'>
            <div className='text-sm font-medium'>
              Change {currentIndex + 1} of {timeline.length}
            </div>
            {currentEntry && (
              <div className='mt-1 text-xs text-gray-600'>
                {currentEntry.change.description}
              </div>
            )}
          </div>

          {/* Statistics and filters */}
          <div className='flex items-center gap-2'>
            <Button
              size='small'
              variant='outline'
              onClick={() => setShowFilters(!showFilters)}>
              <RiFilter3Line className='mr-1 h-4 w-4' />
              Filters
            </Button>

            {statistics && (
              <div className='px-2 text-xs text-gray-600'>
                {statistics.slidesAdded > 0 && (
                  <span className='mr-2 text-green-600'>
                    +{statistics.slidesAdded}
                  </span>
                )}
                {statistics.slidesRemoved > 0 && (
                  <span className='mr-2 text-red-600'>
                    -{statistics.slidesRemoved}
                  </span>
                )}
                {statistics.slidesModified > 0 && (
                  <span className='text-yellow-600'>
                    ~{statistics.slidesModified}
                  </span>
                )}
              </div>
            )}

            {onClose && (
              <Button size='small' variant='secondary' onClick={onClose}>
                <RiCloseLine className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className='mt-4 border-t border-gray-200 pt-4'>
            <div className='flex items-center gap-4'>
              <span className='text-sm font-medium'>Show changes:</span>
              {(Object.keys(changeTypeColors) as ChangeType[]).map((type) => (
                <label
                  key={type}
                  className='flex cursor-pointer items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={filteredTypes.includes(type)}
                    onChange={() => onToggleChangeType(type)}
                    className='rounded'
                  />
                  <span
                    className={cn('h-3 w-3 rounded', changeTypeColors[type])}
                  />
                  <span className='text-sm'>{changeTypeLabels[type]}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
