/**
 * Conversation Title Generation Service
 *
 * Generates concise, descriptive titles for conversations using Claude API.
 * Used to create meaningful activity log entries for Discord, Slack, Email, and Chat.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '@utils/logger'
const log = createLogger('conversation-title')

const anthropic = new Anthropic()

/**
 * Generate a concise title for a conversation based on the user's message.
 * The title should summarize what the user is asking about or discussing.
 *
 * @param userMessage - The user's message or question
 * @param platform - The platform source (discord, slack, email, chat)
 * @param context - Optional context like channel name or previous messages
 * @returns A concise title (max 60 chars) summarizing the conversation topic
 */
export async function generateConversationTitle(
  userMessage: string,
  _platform: 'discord' | 'slack' | 'email' | 'chat',
  context?: {
    channelName?: string
    userName?: string
    previousMessages?: string[]
  },
): Promise<string> {
  // Clean platform-specific mentions first
  const cleanedMessage = cleanMessageContent(userMessage)

  try {
    // For very short messages, use them directly if they're descriptive enough
    if (cleanedMessage.length <= 50 && !cleanedMessage.includes('\n')) {
      // Clean up common greeting patterns
      const cleaned = cleanedMessage
        .replace(/^(hey|hi|hello|yo|sup|what's up|whats up)[,!?\s]*/i, '')
        .trim()

      if (cleaned.length >= 10) {
        // Capitalize first letter and return
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      }
    }

    // Build context for the title generation
    let contextInfo = ''
    if (context?.channelName) {
      contextInfo += `Channel: ${context.channelName}\n`
    }
    if (context?.userName) {
      contextInfo += `User: ${context.userName}\n`
    }
    if (context?.previousMessages?.length) {
      contextInfo += `Previous context: ${context.previousMessages.slice(-2).join(' | ')}\n`
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Generate a concise title (max 50 characters) that summarizes what the user is asking about or discussing. The title should be descriptive and action-oriented when possible.

${contextInfo}
User message: "${cleanedMessage}"

Rules:
- Maximum 50 characters
- No quotes or special formatting
- Use title case
- Be specific about the topic, not generic
- If it's a question, phrase it as the topic being asked about
- If it's a request, phrase it as what's being requested

Respond with ONLY the title, nothing else.`,
        },
      ],
    })

    const title = (response.content[0] as any).text?.trim() || ''

    // Ensure the title isn't too long
    if (title.length > 60) {
      return title.substring(0, 57) + '...'
    }

    return title || getFallbackTitle(cleanedMessage)
  } catch (error) {
    log.error({ err: error }, 'Error generating title')
    return getFallbackTitle(cleanedMessage)
  }
}

/**
 * Clean message content by removing platform-specific mentions and formatting.
 */
function cleanMessageContent(message: string): string {
  return (
    message
      // Remove Discord mentions: <@123>, <@!123>, <@&123> (role), <#123> (channel)
      .replace(/<@[!&]?\d+>/g, '')
      .replace(/<#\d+>/g, '')
      // Remove Discord emojis: <:name:123>, <a:name:123>
      .replace(/<a?:\w+:\d+>/g, '')
      // Remove Slack mentions: <@U123>, <@W123>, <#C123|channel>
      .replace(/<@[UW]\w+>/g, '')
      .replace(/<#C\w+\|[^>]+>/g, '')
      // Remove Slack special formats: <!here>, <!channel>, <!everyone>
      .replace(/<!(?:here|channel|everyone)>/g, '')
      // Clean up multiple spaces and trim
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * Generate a fallback title when AI generation fails.
 * Extracts the first meaningful part of the message.
 */
function getFallbackTitle(message: string): string {
  // Clean platform-specific mentions first
  let cleaned = cleanMessageContent(message)

  // Remove common greetings
  cleaned = cleaned
    .replace(/^(hey|hi|hello|yo|sup|what's up|whats up)[,!?\s]*/i, '')
    .replace(/\n/g, ' ')
    .trim()

  // Take first sentence or first 50 chars
  const firstSentence = (cleaned.split(/[.!?]/)[0] ?? '').trim()

  if (firstSentence.length <= 50) {
    return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
  }

  // Find a good break point
  const truncated = cleaned.substring(0, 47)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Generate a title synchronously for cases where we can't wait for API.
 * This provides a quick, reasonable title without AI.
 */
export function generateQuickTitle(userMessage: string, userName?: string): string {
  const title = getFallbackTitle(userMessage)
  return title || (userName ? `Conversation with ${userName}` : 'New Conversation')
}
