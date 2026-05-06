/**
 * Mention Parser Service
 *
 * Parses @{type:id:displayName} mentions from message text
 * Extracts unique mentions for context building
 */

import type {
  MentionReference,
  ParsedMention,
} from '@domains/conversation/types/conversation.types'

/**
 * Regular expression to match @{type:id} or @{type:id:displayName} mentions
 * Examples:
 * - @{file:abc123}
 * - @{file:abc123:report.pdf}
 * - @{conversation:def456:Chat about Q4}
 */
const MENTION_REGEX = /@\{([a-z-]+):([a-zA-Z0-9-]+)(?::([^}]+))?\}/g

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
      type: match[1]!,
      id: match[2]!,
      displayName: match[3]!,
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return mentions
}

/**
 * Extract unique mention references (type + id) from text
 * Removes duplicates while preserving order
 */
export function extractMentionReferences(text: string): MentionReference[] {
  const mentions = parseMentions(text)
  const unique = new Map<string, MentionReference>()

  mentions.forEach((mention) => {
    const key = `${mention.type}:${mention.id}`
    if (!unique.has(key)) {
      unique.set(key, {
        type: mention.type,
        id: mention.id,
      })
    }
  })

  return Array.from(unique.values())
}

/**
 * Get mentions by type
 */
export function getMentionsByType(text: string, type: string): ParsedMention[] {
  const mentions = parseMentions(text)
  return mentions.filter((m) => m.type === type)
}

/**
 * Check if text contains any mentions
 */
export function hasMentions(text: string): boolean {
  MENTION_REGEX.lastIndex = 0
  return MENTION_REGEX.test(text)
}

/**
 * Get count of mentions in text
 */
export function getMentionCount(text: string): number {
  return parseMentions(text).length
}

/**
 * Validate mention format
 */
export function isValidMention(mention: string): boolean {
  MENTION_REGEX.lastIndex = 0
  return MENTION_REGEX.test(mention)
}

/**
 * Replace mentions with their display names for logging/debugging
 * Example: @{file:abc123:report.pdf} → @report.pdf
 */
export function formatMentionsForDisplay(text: string): string {
  return text.replace(MENTION_REGEX, (_match, type, id, displayName) => {
    if (displayName) {
      return `@${displayName}`
    }
    return `@${type}:${id}`
  })
}
