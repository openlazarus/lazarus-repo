'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useRef, useState } from 'react'

import { MOTION } from '@/lib/design-system/ui-constants'
import { cn } from '@/lib/utils'

// Types
type TimeLevel = 'spectrum' | 'years' | 'months' | 'days' | 'hours' | 'items'

interface MemoryCell {
  id: string
  timestamp: Date
  label: string
  count: number // Number of memories inside
  intensity: number // 0-1 scale based on count
  level: TimeLevel
  children?: MemoryCell[]
  // For leaf nodes (items)
  itemType?: 'email' | 'file' | 'message' | 'meeting' | 'document'
  itemTitle?: string
  itemPreview?: string
}

interface TimelineView {
  level: TimeLevel
  cells: MemoryCell[]
  parentCell?: MemoryCell
  startDate: Date
  endDate: Date
}

interface ActivityTimelineProps {
  startYear?: number
  endYear?: number
  data: MemoryCell[]
  className?: string
  isDark?: boolean
  onCellSelect?: (cell: MemoryCell) => void
}

// Get cell color based on intensity
const getCellColor = (intensity: number, isDark: boolean) => {
  // Create a smooth gradient effect
  if (isDark) {
    // White with varying opacity for dark mode
    const opacity = 0.1 + intensity * 0.7
    return `rgba(255, 255, 255, ${opacity})`
  } else {
    // Dark gray with varying opacity for light mode
    const grayValue = Math.floor(255 - intensity * 200)
    return `rgb(${grayValue}, ${grayValue}, ${grayValue})`
  }
}

// Format date based on level
const formatDate = (date: Date, level: TimeLevel): string => {
  switch (level) {
    case 'spectrum':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      })
    case 'years':
      return date.getFullYear().toString()
    case 'months':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    case 'days':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    case 'hours':
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    case 'items':
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    default:
      return date.toLocaleDateString()
  }
}

// Single cell component
const Cell = ({
  cell,
  width,
  isDark,
  isHovered,
  onHover,
  onClick,
}: {
  cell: MemoryCell
  width: number
  isDark: boolean
  isHovered: boolean
  onHover: (hovering: boolean) => void
  onClick: () => void
}) => {
  const color = getCellColor(cell.intensity, isDark)
  const hasChildren = cell.children && cell.children.length > 0

  return (
    <m.div
      className='relative cursor-pointer'
      style={{ width: `${width}%` }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}>
      {/* Cell rectangle */}
      <m.div
        className='h-12'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
        style={{ backgroundColor: color }}
      />

      {/* Hover state */}
      <AnimatePresence>
        {isHovered && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              'absolute -top-16 left-1/2 z-10 -translate-x-1/2',
              'whitespace-nowrap rounded-lg px-3 py-2 shadow-lg',
              'pointer-events-none text-xs font-medium',
              isDark
                ? 'border border-white/10 bg-[#1d1d1f] text-white'
                : 'border border-black/5 bg-white text-[#1d1d1f]',
            )}>
            <div className='font-semibold'>{cell.label} Memory cell</div>
            <div
              className={cn(
                'mt-1 text-[10px]',
                isDark ? 'text-white/60' : 'text-[#86868b]',
              )}>
              {hasChildren
                ? `${cell.count} memories inside`
                : cell.itemType || 'Memory'}
            </div>
            {cell.itemTitle && (
              <div className='mt-1 max-w-[200px] truncate text-[11px]'>
                {cell.itemTitle}
              </div>
            )}
            {/* Tooltip arrow */}
            <div
              className={cn(
                'absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45',
                isDark
                  ? 'border-b border-r border-white/10 bg-[#1d1d1f]'
                  : 'border-b border-r border-black/5 bg-white',
              )}
            />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

// Generate spectrum cells for level 0
const generateSpectrumCells = (
  data: MemoryCell[],
  startYear: number,
  endYear: number,
): MemoryCell[] => {
  const cells: MemoryCell[] = []
  const totalYears = endYear - startYear + 1

  // If we have less than 4 years, split into quarters (3 months each)
  // Otherwise split into months
  const useQuarters = totalYears < 4
  const periodsPerYear = useQuarters ? 4 : 12

  for (let year = startYear; year <= endYear; year++) {
    for (let period = 0; period < periodsPerYear; period++) {
      const startMonth = useQuarters ? period * 3 : period
      const endMonth = useQuarters ? (period + 1) * 3 - 1 : period

      const date = new Date(year, startMonth, 1)

      // Find all memories in this period
      let count = 0
      const childCells: MemoryCell[] = []

      // Aggregate data from the actual data
      data.forEach((yearCell) => {
        if (yearCell.timestamp.getFullYear() === year && yearCell.children) {
          yearCell.children.forEach((monthCell) => {
            const month = monthCell.timestamp.getMonth()
            if (month >= startMonth && month <= endMonth) {
              count += monthCell.count
              childCells.push(monthCell)
            }
          })
        }
      })

      // Add some noise to make the spectrum more interesting
      const noise = Math.random() * 0.2 - 0.1
      const intensity = Math.max(0, Math.min(1, count / 1000 + noise))

      const label = useQuarters
        ? `Q${period + 1} ${year}`
        : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      cells.push({
        id: `spectrum-${year}-${period}`,
        timestamp: date,
        label,
        count,
        intensity,
        level: 'spectrum',
        children: childCells.length > 0 ? childCells : undefined,
      })
    }
  }

  return cells
}

// Timeline view component
const TimelineView = ({
  view,
  isDark,
  onCellClick,
  onBack,
}: {
  view: TimelineView
  isDark: boolean
  onCellClick: (cell: MemoryCell) => void
  onBack?: () => void
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate width for each cell
  const cellCount = view.cells.length
  const width = 100 / cellCount

  // For sparse timelines (< 10 items), we'll space them out
  const isSparse = cellCount < 10 && view.level !== 'spectrum'

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className='w-full'>
      {/* Timeline container */}
      <div className='relative'>
        {/* Cells */}
        <div className={cn('flex', isSparse && 'justify-around px-12')}>
          {view.cells.map((cell, index) => (
            <Cell
              key={cell.id}
              cell={cell}
              width={isSparse ? 60 / cellCount : width}
              isDark={isDark}
              isHovered={hoveredIndex === index}
              onHover={(hovering) => setHoveredIndex(hovering ? index : null)}
              onClick={() => onCellClick(cell)}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div
          className={cn(
            'mt-2 flex',
            isSparse ? 'justify-around px-12' : 'justify-between',
          )}>
          {(isSparse || view.level === 'spectrum'
            ? view.cells.filter((_, i) => i % Math.ceil(cellCount / 6) === 0)
            : [
                view.cells[0],
                view.cells[Math.floor(view.cells.length / 2)],
                view.cells[view.cells.length - 1],
              ]
          )
            .filter(Boolean)
            .map((cell) => (
              <span
                key={cell.id}
                className={cn(
                  'text-xs',
                  isDark ? 'text-white/40' : 'text-[#86868b]',
                )}>
                {formatDate(cell.timestamp, view.level)}
              </span>
            ))}
        </div>
      </div>

      {/* Back button at bottom */}
      {onBack && (
        <m.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'mt-4 rounded-full px-3 py-1 text-sm font-medium transition-colors',
            isDark
              ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12]'
              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e5e5e7]',
          )}
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}>
          ← Back to {view.parentCell?.label || 'Timeline'}
        </m.button>
      )}
    </m.div>
  )
}

// Main component
export function ActivityTimeline({
  startYear = 2022,
  endYear = new Date().getFullYear(),
  data,
  className,
  isDark = false,
  onCellSelect,
}: ActivityTimelineProps) {
  const [viewStack, setViewStack] = useState<TimelineView[]>([
    {
      level: 'spectrum',
      cells: generateSpectrumCells(data, startYear, endYear),
      startDate: new Date(startYear, 0, 1),
      endDate: new Date(endYear, 11, 31),
    },
  ])

  const currentView = viewStack[viewStack.length - 1]

  const handleCellClick = (cell: MemoryCell) => {
    // Recursive function to find the deepest level with more than one child
    const findNextMeaningfulLevel = (currentCell: MemoryCell): MemoryCell => {
      if (!currentCell.children || currentCell.children.length === 0) {
        // This is a leaf node
        return currentCell
      }

      if (currentCell.children.length === 1) {
        // Skip this level and go deeper
        return findNextMeaningfulLevel(currentCell.children[0])
      }

      // This level has multiple children, use it
      return currentCell
    }

    const meaningfulCell = findNextMeaningfulLevel(cell)

    if (meaningfulCell === cell && cell.children && cell.children.length > 1) {
      // Zoom into this cell's children
      const newView: TimelineView = {
        level: getNextLevel(cell.level),
        cells: cell.children,
        parentCell: cell,
        startDate: cell.children[0].timestamp,
        endDate: cell.children[cell.children.length - 1].timestamp,
      }
      setViewStack([...viewStack, newView])
    } else if (
      meaningfulCell !== cell &&
      meaningfulCell.children &&
      meaningfulCell.children.length > 1
    ) {
      // Skip intermediate levels and go straight to the meaningful level
      const newView: TimelineView = {
        level: meaningfulCell.level,
        cells: meaningfulCell.children,
        parentCell: meaningfulCell,
        startDate: meaningfulCell.children[0].timestamp,
        endDate:
          meaningfulCell.children[meaningfulCell.children.length - 1].timestamp,
      }
      setViewStack([...viewStack, newView])
    } else if (meaningfulCell.itemType) {
      // This is a leaf node, just select it
      onCellSelect?.(meaningfulCell)
    }
  }

  const handleBack = () => {
    if (viewStack.length > 1) {
      setViewStack(viewStack.slice(0, -1))
    }
  }

  const getNextLevel = (currentLevel: TimeLevel): TimeLevel => {
    const levels: TimeLevel[] = [
      'spectrum',
      'years',
      'months',
      'days',
      'hours',
      'items',
    ]
    const currentIndex = levels.indexOf(currentLevel)
    return levels[Math.min(currentIndex + 1, levels.length - 1)]
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={MOTION.transitions.complex}
      className={cn('w-full', className)}>
      {/* Timeline container */}
      <div
        className={cn(
          'rounded-2xl p-8',
          isDark ? 'bg-white/[0.02]' : 'bg-[#fafafa]',
        )}>
        <AnimatePresence mode='wait'>
          <TimelineView
            key={viewStack.length}
            view={currentView}
            isDark={isDark}
            onCellClick={handleCellClick}
            onBack={viewStack.length > 1 ? handleBack : undefined}
          />
        </AnimatePresence>
      </div>

      {/* Timeline info */}
      <div
        className={cn(
          'mt-4 flex items-center justify-between px-8',
          'text-xs',
          isDark ? 'text-white/40' : 'text-[#a1a1a6]',
        )}>
        <span>Level: {currentView.level}</span>
        <span>{currentView.cells.length} cells</span>
      </div>
    </m.div>
  )
}
