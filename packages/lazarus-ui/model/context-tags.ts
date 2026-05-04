import { generateItemId, Item } from './item'

/**
 * Date Range Item - represents a time period that can be tagged
 */
export interface DateRangeItem extends Item {
  type: 'date-range'
  startDate: Date | string
  endDate: Date | string
  displayFormat?: 'short' | 'long' | 'relative'
}

/**
 * Link Item - represents a URL that can be tagged
 */
export interface LinkItem extends Item {
  type: 'link'
  url: string
  title?: string
  favicon?: string
  domain?: string
}

/**
 * Create a date range item
 */
export function createDateRangeItem(
  startDate: Date | string,
  endDate: Date | string,
  workspaceId: string,
  name?: string,
): DateRangeItem {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  // Generate a name if not provided
  const defaultName = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`

  return {
    id: generateItemId(),
    type: 'date-range',
    name: name || defaultName,
    workspaceId,
    startDate,
    endDate,
    metadata: {
      durationDays: Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    icon: '/icons/workspace/calendar-icon.svg',
  }
}

/**
 * Create a link item
 */
export function createLinkItem(
  url: string,
  workspaceId: string,
  title?: string,
): LinkItem {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')

    return {
      id: generateItemId(),
      type: 'link',
      name: title || domain,
      workspaceId,
      url,
      title,
      domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      metadata: {
        protocol: urlObj.protocol,
        pathname: urlObj.pathname,
        search: urlObj.search,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: '/icons/workspace/link-icon.svg',
    }
  } catch (error) {
    // If URL is invalid, still create the item
    return {
      id: generateItemId(),
      type: 'link',
      name: title || url,
      workspaceId,
      url,
      title,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: '/icons/workspace/link-icon.svg',
    }
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(
  item: DateRangeItem,
  format: 'short' | 'long' | 'relative' = 'short',
): string {
  const start =
    typeof item.startDate === 'string'
      ? new Date(item.startDate)
      : item.startDate
  const end =
    typeof item.endDate === 'string' ? new Date(item.endDate) : item.endDate

  if (format === 'relative') {
    const now = new Date()
    const daysUntilStart = Math.ceil(
      (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const daysUntilEnd = Math.ceil(
      (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (daysUntilStart > 0) {
      return `In ${daysUntilStart} days`
    } else if (daysUntilEnd < 0) {
      return `${Math.abs(daysUntilEnd)} days ago`
    } else {
      return 'Current period'
    }
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { month: 'short', day: 'numeric' }

  return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`
}
