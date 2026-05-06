'use client'

import { format, isThisWeek, isThisYear, isToday, isYesterday } from 'date-fns'
import { memo, useMemo } from 'react'

import { cn } from '@/lib/utils'

export interface TimeStampProps {
  date: Date
  format?: 'header' | 'inline' | 'relative' | 'absolute' | 'smart'
  className?: string
  variant?: 'default' | 'header' | 'inline'
}

/**
 * Formats a date for message headers (iMessage style)
 * - Today: "Today 2:30 PM"
 * - Yesterday: "Yesterday 2:30 PM"
 * - This week: "Monday 2:30 PM"
 * - This year: "March 15, 2:30 PM"
 * - Older: "March 15, 2023, 2:30 PM"
 */
function formatHeaderDate(date: Date): string {
  const now = new Date()
  const timeStr = formatInlineTime(date)

  if (isToday(date)) {
    return `Today ${timeStr}`
  }

  if (isYesterday(date)) {
    return `Yesterday ${timeStr}`
  }

  // Within last 7 days - show day name
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return `${format(date, 'EEEE')} ${timeStr}`
  }

  // This year - show month and day
  if (isThisYear(date)) {
    return `${format(date, 'MMMM d')}, ${timeStr}`
  }

  // Older - show full date
  return `${format(date, 'MMMM d, yyyy')}, ${timeStr}`
}

/**
 * Formats a date for inline timestamps (iMessage style)
 * Always shows time in format: "2:30 PM"
 */
function formatInlineTime(date: Date): string {
  return format(date, 'h:mm a')
}

/**
 * Formats a date in a human-friendly way (smart format)
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday 2:30 PM"
 * - This week: "Monday 2:30 PM"
 * - This year: "Mar 15, 2:30 PM"
 * - Older: "Mar 15, 2023"
 */
function formatSmartDate(date: Date): string {
  const now = new Date()
  const timeStr = formatInlineTime(date)

  // Today
  if (isToday(date)) {
    return timeStr
  }

  // Yesterday
  if (isYesterday(date)) {
    return `Yesterday ${timeStr}`
  }

  // This week (within 7 days)
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    const dayName = format(date, 'EEEE')
    return `${dayName} ${timeStr}`
  }

  // This year
  if (isThisYear(date)) {
    const dateStr = format(date, 'MMM d')
    return `${dateStr}, ${timeStr}`
  }

  // Older dates
  return format(date, 'MMM d, yyyy')
}

/**
 * TimeStamp - Displays formatted timestamps with multiple format options
 *
 * Formats:
 * - 'header': Day headers in message list (iMessage style)
 * - 'inline': Time shown with messages
 * - 'relative': "2 minutes ago", "1 hour ago"
 * - 'absolute': "March 15, 2024 at 2:30 PM"
 * - 'smart': Context-aware formatting (default)
 */
export const TimeStamp = memo<TimeStampProps>(
  ({ date, format = 'smart', className, variant = 'default' }) => {
    const formattedDate = useMemo(() => {
      switch (format) {
        case 'header':
          return formatHeaderDate(date)

        case 'inline':
          return formatInlineTime(date)

        case 'relative': {
          const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
          const diffMs = date.getTime() - Date.now()
          const diffSec = Math.round(diffMs / 1000)
          const diffMin = Math.round(diffSec / 60)
          const diffHour = Math.round(diffMin / 60)
          const diffDay = Math.round(diffHour / 24)

          if (Math.abs(diffSec) < 60) return 'just now'
          if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
          if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')
          if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')

          return formatSmartDate(date)
        }

        case 'absolute': {
          return (
            date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) +
            ' at ' +
            formatInlineTime(date)
          )
        }

        case 'smart':
        default:
          return formatSmartDate(date)
      }
    }, [date, format])

    // Apply iMessage-style typography based on variant
    const variantStyles: Record<string, string> = {
      header: 'text-[11px] text-[#8E8E93]',
      inline: 'text-[11px] font-medium text-[#8E8E93]',
      default: 'text-xs text-muted-foreground',
    }

    // For header format, we need to split the date and time
    if (format === 'header' && variant === 'header') {
      const parts = formattedDate.split(' ')
      const timeStr = formatInlineTime(date)
      const dateStr = formattedDate.replace(` ${timeStr}`, '')

      return (
        <time
          dateTime={date.toISOString()}
          className={cn('timestamp', variantStyles[variant], className)}
          title={date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })}>
          <span className='font-semibold'>{dateStr}</span>{' '}
          <span className='font-normal'>{timeStr}</span>
        </time>
      )
    }

    return (
      <time
        dateTime={date.toISOString()}
        className={cn('timestamp', variantStyles[variant], className)}
        title={date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })}>
        {formattedDate}
      </time>
    )
  },
)

TimeStamp.displayName = 'TimeStamp'
