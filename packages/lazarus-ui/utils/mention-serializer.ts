/**
 * Mention Serializer/Parser Utilities
 *
 * Handles conversion between structured Item objects and inline @{type:id} mentions
 * Format: @{type:id} or @{type:id:displayName}
 *
 * Examples:
 * - @{file:abc123} → File item
 * - @{conversation:def456} → Conversation item
 * - @{file:abc123:report.pdf} → File with display name
 */

import { Item } from '@/model/item'

export interface ParsedMention {
  type: string
  id: string
  displayName?: string
  fullMatch: string
  startIndex: number
  endIndex: number
}

/**
 * Regular expression to match @{type:id} or @{type:id:displayName} mentions
 * Matches: @{file:abc123} or @{file:abc123:report.pdf}
 */
const MENTION_REGEX = /@\{([a-z-]+):([a-zA-Z0-9-]+)(?::([^}]+))?\}/g

/**
 * Serialize an Item into a mention string
 */
export function serializeMention(item: Item): string {
  // Include display name to make mentions human-readable
  const displayName = (item.name ?? '').replace(/[{}:]/g, '_')
  return `@{${item.type}:${item.id}:${displayName}}`
}

/**
 * Serialize multiple items into mention strings
 */
export function serializeMentions(items: Item[]): string[] {
  return items.map(serializeMention)
}

/**
 * Parse all mentions from a text string
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = []

  // Reset regex state
  MENTION_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    mentions.push({
      type: match[1],
      id: match[2],
      displayName: match[3],
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return mentions
}

/**
 * Extract unique item IDs from mentions in text
 */
export function extractMentionIds(
  text: string,
): Array<{ type: string; id: string }> {
  const mentions = parseMentions(text)
  const unique = new Map<string, { type: string; id: string }>()

  mentions.forEach((mention) => {
    const key = `${mention.type}:${mention.id}`
    if (!unique.has(key)) {
      unique.set(key, { type: mention.type, id: mention.id })
    }
  })

  return Array.from(unique.values())
}

/**
 * Insert a mention at a specific position in text
 */
export function insertMention(
  text: string,
  mention: string,
  position: number,
): string {
  return text.slice(0, position) + mention + ' ' + text.slice(position)
}

/**
 * Replace mentions with display names for readable preview
 * Example: @{file:abc123:report.pdf} → @report.pdf
 */
export function formatMentionsForDisplay(text: string): string {
  return text.replace(MENTION_REGEX, (match, type, id, displayName) => {
    if (displayName) {
      return `@${displayName}`
    }
    return `@${type}:${id}`
  })
}

/**
 * Validate mention format
 */
export function isValidMention(mention: string): boolean {
  MENTION_REGEX.lastIndex = 0
  return MENTION_REGEX.test(mention)
}

/**
 * Get mention at cursor position
 */
export function getMentionAtPosition(
  text: string,
  position: number,
): ParsedMention | null {
  const mentions = parseMentions(text)
  return (
    mentions.find((m) => position >= m.startIndex && position <= m.endIndex) ||
    null
  )
}

/**
 * Check if cursor is inside a mention trigger (@)
 * Returns the trigger position if found
 */
export function getTriggerPosition(
  text: string,
  cursorPosition: number,
): number | null {
  // Look backwards from cursor to find @ that's not part of a complete mention
  let pos = cursorPosition - 1

  while (pos >= 0) {
    const char = text[pos]

    if (char === '@') {
      // Check if this @ is part of a complete mention
      const textUpToCursor = text.substring(0, cursorPosition)
      const mentions = parseMentions(textUpToCursor)
      const isPartOfMention = mentions.some(
        (m) => pos >= m.startIndex && pos < m.endIndex,
      )

      if (!isPartOfMention) {
        // Found a trigger @ that's not part of a complete mention
        return pos
      }
      return null
    }

    // Stop at whitespace or newline
    if (char === ' ' || char === '\n') {
      return null
    }

    pos--
  }

  return null
}

/**
 * Get query string after @ trigger
 * Example: "Check @rep" with cursor at end → returns "rep"
 */
export function getQueryAfterTrigger(
  text: string,
  cursorPosition: number,
  triggerPosition: number,
): string {
  return text.substring(triggerPosition + 1, cursorPosition).trim()
}
