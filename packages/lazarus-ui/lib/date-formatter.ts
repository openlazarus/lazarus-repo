import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  differenceInSeconds,
  differenceInWeeks,
  differenceInYears,
  format,
  isSameDay,
  isToday,
  isYesterday,
} from 'date-fns'

/**
 * Formats a timestamp in a human-readable way similar to messaging apps:
 * Examples: "Today · 10:10 AM", "Yesterday · 9:36 PM", "Sunday · 3:57 PM"
 */
export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)

  let dayPart = ''
  const timePart = format(date, 'h:mm a')

  if (isToday(date)) {
    dayPart = 'Today'
  } else if (isYesterday(date)) {
    dayPart = 'Yesterday'
  } else if (
    isSameDay(date, new Date()) === false &&
    date.getTime() > Date.now() - 6 * 24 * 60 * 60 * 1000
  ) {
    // Within the last week (but not today or yesterday)
    dayPart = format(date, 'EEEE')
  } else {
    // Older than a week
    dayPart = format(date, 'MMMM d')
  }

  return `${dayPart} · ${timePart}`
}

/**
 * Formats a timestamp in a detailed way, showing the full date and time
 * Example: "January 1, 2023 · 10:10 AM"
 */
export const formatDetailedDate = (timestamp: string) => {
  return format(new Date(timestamp), 'MMMM d, yyyy · h:mm a')
}

/**
 * Returns just the day part of a timestamp (Today, Yesterday, day of week, or date)
 */
export const formatDayPart = (timestamp: string) => {
  const date = new Date(timestamp)

  if (isToday(date)) {
    return 'Today'
  } else if (isYesterday(date)) {
    return 'Yesterday'
  } else if (
    isSameDay(date, new Date()) === false &&
    date.getTime() > Date.now() - 6 * 24 * 60 * 60 * 1000
  ) {
    // Within the last week (but not today or yesterday)
    return format(date, 'EEEE')
  } else {
    // Older than a week
    return format(date, 'MMMM d')
  }
}

/**
 * Returns just the time part of a timestamp in 12-hour format
 * Example: "10:10 AM"
 */
export const formatTimePart = (timestamp: string) => {
  return format(new Date(timestamp), 'h:mm a')
}

/**
 * Returns a relative time string like "1h ago", "2 days ago", etc. (Snapchat style)
 * Example: "just now", "3m ago", "2h ago", "1 day ago", "2 weeks ago", "3 months ago", "1 year ago"
 */
export const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()

  const secondsAgo = differenceInSeconds(now, date)
  const minutesAgo = differenceInMinutes(now, date)
  const hoursAgo = differenceInHours(now, date)
  const daysAgo = differenceInDays(now, date)
  const weeksAgo = differenceInWeeks(now, date)
  const monthsAgo = differenceInMonths(now, date)
  const yearsAgo = differenceInYears(now, date)

  if (secondsAgo < 60) {
    return 'just now'
  } else if (minutesAgo < 60) {
    return `${minutesAgo}m ago`
  } else if (hoursAgo < 24) {
    return `${hoursAgo}h ago`
  } else if (daysAgo < 7) {
    return daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`
  } else if (weeksAgo < 4) {
    return weeksAgo === 1 ? '1 week ago' : `${weeksAgo} weeks ago`
  } else if (monthsAgo < 12) {
    return monthsAgo === 1 ? '1 month ago' : `${monthsAgo} months ago`
  } else {
    return yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`
  }
}
