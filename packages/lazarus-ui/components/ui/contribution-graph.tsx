'use client'

import * as m from 'motion/react-m'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useWindowedScroll } from '@/hooks/ui/use-windowed-scroll'
import { COLORS } from '@/lib/design-system/ui-constants'
import { cn } from '@/lib/utils'

interface ContributionDay {
  date: Date
  count: number
  level: 0 | 1 | 2 | 3 | 4 // 0 = no activity, 4 = highest activity
}

interface ContributionGraphProps {
  data: ContributionDay[]
  year: number
  isDark?: boolean
  onDayClick?: (day: ContributionDay) => void
  onPeriodSelect?: (startDate: Date, endDate: Date) => void
}

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ContributionGraph({
  data,
  year,
  isDark,
  onDayClick,
  onPeriodSelect,
}: ContributionGraphProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleWeeks, setVisibleWeeks] = useState(53)

  // Calculate how many weeks can fit based on container width
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        // Each week takes 14px (11px cell + 3px gap), plus 32px for day labels
        const availableWidth = width - 40 // 32px labels + 8px padding
        const weeksToShow = Math.floor(availableWidth / 14)
        setVisibleWeeks(Math.min(53, Math.max(12, weeksToShow))) // Min 12 weeks (3 months), max 53
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Check if a date is within the selection range
  const isInSelectionRange = (date: Date) => {
    if (!selectionStart) return false

    const start = selectionStart
    const end = selectionEnd || hoveredDay?.date

    if (!end) return false

    const minDate = start < end ? start : end
    const maxDate = start < end ? end : start

    return date >= minDate && date <= maxDate
  }

  // Get color based on activity level
  const getColor = (level: number, isSelected: boolean = false) => {
    if (isSelected) {
      // Selected state - use green with higher opacity
      if (level === 0) return 'rgba(34, 197, 94, 0.15)'
      const colors = [
        'rgba(34, 197, 94, 0.35)', // Level 1
        'rgba(34, 197, 94, 0.55)', // Level 2
        'rgba(34, 197, 94, 0.75)', // Level 3
        'rgba(34, 197, 94, 0.95)', // Level 4
      ]
      return colors[level - 1]
    }
    if (level === 0)
      return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'

    // Use Lazarus blue gradient colors
    const colors = [
      'rgba(0, 152, 252, 0.2)', // Level 1 - 20% opacity
      'rgba(0, 152, 252, 0.4)', // Level 2 - 40% opacity
      'rgba(0, 152, 252, 0.7)', // Level 3 - 70% opacity
      COLORS.primary.blue, // Level 4 - Full blue
    ]

    return colors[level - 1]
  }

  // Generate weeks and days grid
  const allWeeks = useMemo(() => {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    // Adjust start date to the beginning of the week
    const startDay = startDate.getDay()
    const adjustedStartDate = new Date(startDate)
    adjustedStartDate.setDate(startDate.getDate() - startDay)

    const weeks: ContributionDay[][] = []
    let currentWeek: ContributionDay[] = []
    const currentDate = new Date(adjustedStartDate)

    while (currentDate <= endDate) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      // Find data for current date
      const dayData = data.find(
        (d) =>
          d.date.getFullYear() === currentDate.getFullYear() &&
          d.date.getMonth() === currentDate.getMonth() &&
          d.date.getDate() === currentDate.getDate(),
      )

      currentWeek.push({
        date: new Date(currentDate),
        count: dayData?.count || 0,
        level: dayData?.level || 0,
      })

      currentDate.setDate(currentDate.getDate() + 1)

      // Break if we've gone beyond the end of the year
      if (currentDate.getFullYear() > year) break
    }

    // Add final week if not empty
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }, [data, year])

  // Find which week contains today
  const currentWeekIndex = useMemo(() => {
    const today = new Date()
    return allWeeks.findIndex((week) =>
      week.some((day) => day.date.toDateString() === today.toDateString()),
    )
  }, [allWeeks])

  // Auto-position the visible window to show the current week
  const {
    startIndex: weekStartIndex,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
  } = useWindowedScroll({
    totalItems: allWeeks.length,
    visibleItems: visibleWeeks,
    focusIndex: currentWeekIndex >= 0 ? currentWeekIndex : allWeeks.length - 1,
  })

  // Get the weeks to display
  const displayWeeks = useMemo(() => {
    return allWeeks.slice(weekStartIndex, weekStartIndex + visibleWeeks)
  }, [allWeeks, weekStartIndex, visibleWeeks])

  // Calculate which months are visible
  const visibleMonths = useMemo(() => {
    if (displayWeeks.length === 0) return []

    const monthsSet = new Set<number>()
    displayWeeks.forEach((week) => {
      week.forEach((day) => {
        if (day.date.getFullYear() === year) {
          monthsSet.add(day.date.getMonth())
        }
      })
    })

    return Array.from(monthsSet).sort((a, b) => a - b)
  }, [displayWeeks, year])

  return (
    <div className='relative w-full' ref={containerRef}>
      <div className='relative'>
        {/* Months header with navigation */}
        <div className='relative mb-2 flex h-4 items-center justify-between'>
          <div className='relative ml-8 flex flex-1'>
            {visibleMonths.map((monthIndex, idx) => {
              const month = months[monthIndex]
              // Find the first week that contains this month
              let weekPosition = 0
              for (let i = 0; i < displayWeeks.length; i++) {
                const hasMonth = displayWeeks[i].some(
                  (day) =>
                    day.date.getFullYear() === year &&
                    day.date.getMonth() === monthIndex,
                )
                if (hasMonth) {
                  weekPosition = i
                  break
                }
              }

              return (
                <div
                  key={`${month}-${idx}`}
                  className={cn(
                    'absolute text-[11px] font-medium',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}
                  style={{
                    left: `${weekPosition * 14}px`,
                  }}>
                  {month}
                </div>
              )
            })}
          </div>

          {/* Navigation buttons */}
          {allWeeks.length > visibleWeeks && (
            <div className='ml-2 flex gap-1'>
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className={cn(
                  'rounded p-1 transition-all',
                  canScrollLeft
                    ? isDark
                      ? 'text-white/60 hover:bg-white/10 hover:text-white'
                      : 'text-black/60 hover:bg-black/10 hover:text-black'
                    : isDark
                      ? 'cursor-not-allowed text-white/20'
                      : 'cursor-not-allowed text-black/20',
                )}>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                  <path
                    d='M7.5 9L4.5 6L7.5 3'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
              <button
                onClick={scrollRight}
                disabled={!canScrollRight}
                className={cn(
                  'rounded p-1 transition-all',
                  canScrollRight
                    ? isDark
                      ? 'text-white/60 hover:bg-white/10 hover:text-white'
                      : 'text-black/60 hover:bg-black/10 hover:text-black'
                    : isDark
                      ? 'cursor-not-allowed text-white/20'
                      : 'cursor-not-allowed text-black/20',
                )}>
                <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                  <path
                    d='M4.5 9L7.5 6L4.5 3'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className='mt-8 flex gap-1'>
          {/* Day labels */}
          <div className='flex flex-col gap-[3px] pr-2'>
            {days.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'flex h-[11px] items-center text-[10px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                  index % 2 === 0 && 'opacity-0',
                )}>
                {day}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          <div className='flex gap-[3px]'>
            {displayWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className='flex flex-col gap-[3px]'>
                {week.map((day, dayIndex) => {
                  const isInYear = day.date.getFullYear() === year
                  const isToday =
                    new Date().toDateString() === day.date.toDateString()
                  const isSelected = isInSelectionRange(day.date)
                  const isSelectionEndpoint =
                    selectionStart &&
                    (day.date.getTime() === selectionStart.getTime() ||
                      (selectionEnd &&
                        day.date.getTime() === selectionEnd.getTime()))

                  return (
                    <m.div
                      key={dayIndex}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: weekIndex * 0.01 + dayIndex * 0.002,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ scale: 1.2 }}
                      onMouseEnter={(e) => {
                        setHoveredDay(day)
                        if (containerRef.current) {
                          const rect =
                            containerRef.current.getBoundingClientRect()
                          const cellRect =
                            e.currentTarget.getBoundingClientRect()

                          // Calculate position relative to container
                          const x =
                            cellRect.left - rect.left + cellRect.width / 2
                          const y = cellRect.top - rect.top

                          // Ensure tooltip stays within bounds (considering tooltip width ~120px)
                          const adjustedX = Math.max(
                            60,
                            Math.min(x, rect.width - 60),
                          )

                          setTooltipPosition({
                            x: adjustedX,
                            y: y,
                          })
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => {
                        if (!isInYear) return

                        if (!selectionStart) {
                          // Start a new selection
                          setSelectionStart(day.date)
                          setSelectionEnd(null)
                          onDayClick?.(day)
                        } else if (!selectionEnd) {
                          // Complete the selection
                          setSelectionEnd(day.date)
                          const start = selectionStart
                          const end = day.date
                          const minDate = start < end ? start : end
                          const maxDate = start < end ? end : start
                          onPeriodSelect?.(minDate, maxDate)
                        } else {
                          // Start a new selection
                          setSelectionStart(day.date)
                          setSelectionEnd(null)
                          onDayClick?.(day)
                        }
                      }}
                      className={cn(
                        'h-[11px] w-[11px] rounded-[2px] transition-colors duration-200',
                        isInYear && 'cursor-pointer',
                        isToday && 'ring-1 ring-offset-1',
                        isToday && (isDark ? 'ring-white/50' : 'ring-black/30'),
                        isSelectionEndpoint &&
                          'ring-2 ring-green-500 ring-offset-1',
                      )}
                      style={{
                        backgroundColor: isInYear
                          ? getColor(day.level, isSelected)
                          : 'transparent',
                        opacity: isInYear ? 1 : 0,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend and Selection Info */}
        <div className='mt-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'text-[11px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              Less
            </span>
            <div className='flex gap-[3px]'>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className='h-[11px] w-[11px] rounded-[2px]'
                  style={{ backgroundColor: getColor(level) }}
                />
              ))}
            </div>
            <span
              className={cn(
                'text-[11px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              More
            </span>
          </div>

          {/* Selection info */}
          {(selectionStart || selectionEnd) && (
            <div className='flex items-center gap-2'>
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/60' : 'text-black/60',
                )}>
                {selectionEnd && selectionStart ? (
                  <>
                    {selectionStart.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' → '}
                    {selectionEnd.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </>
                ) : (
                  <>Click another day to select period</>
                )}
              </span>
              <button
                onClick={() => {
                  setSelectionStart(null)
                  setSelectionEnd(null)
                }}
                className={cn(
                  'rounded px-2 py-0.5 text-[11px] transition-colors',
                  isDark
                    ? 'text-white/60 hover:bg-white/10 hover:text-white'
                    : 'text-black/60 hover:bg-black/10 hover:text-black',
                )}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <m.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className={cn(
            'pointer-events-none absolute z-10 rounded-lg px-3 py-2 text-xs',
            'shadow-lg backdrop-blur-sm',
            isDark
              ? 'border border-white/10 bg-black/90 text-white'
              : 'border border-black/10 bg-white/90 text-black',
          )}
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 40}px`,
            transform: 'translateX(-50%)',
          }}>
          <div className='font-medium'>{hoveredDay.count} activities</div>
          <div
            className={cn(
              'text-[11px]',
              isDark ? 'text-white/60' : 'text-black/60',
            )}>
            {hoveredDay.date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </m.div>
      )}
    </div>
  )
}
