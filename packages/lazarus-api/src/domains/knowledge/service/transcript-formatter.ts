import type { ConversationMessage } from '@domains/activity/types/activity.types'

const MAX_CONTENT_CHARS = 2000
const MAX_TOOL_INPUT_CHARS = 500
const MAX_TOOL_RESULT_CHARS = 500

/**
 * Turn an activity log's conversation array into a rich, librarian-friendly
 * transcript. Preserves user/assistant turns, tool calls with parameters,
 * tool results, and thinking blocks. Long fields are truncated to stay
 * within token budget.
 */
export function formatTranscript(messages: ConversationMessage[]): string {
  const lines: string[] = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push(`\n## User\n${truncate(msg.content, MAX_CONTENT_CHARS)}`)
      continue
    }

    if (msg.role === 'assistant') {
      if (msg.isThinking) {
        lines.push(`\n### Assistant (thinking)\n${truncate(msg.content, MAX_CONTENT_CHARS)}`)
      } else if (msg.content && msg.content.trim().length > 0) {
        lines.push(`\n## Assistant\n${truncate(msg.content, MAX_CONTENT_CHARS)}`)
      }
      continue
    }

    if (msg.role === 'tool') {
      const name = msg.toolName || 'unknown-tool'
      const input =
        msg.toolInput !== undefined ? safeStringify(msg.toolInput, MAX_TOOL_INPUT_CHARS) : ''
      const result =
        msg.toolResult !== undefined ? safeStringify(msg.toolResult, MAX_TOOL_RESULT_CHARS) : ''
      const parts = [`\n### Tool call: ${name}`]
      if (input) parts.push(`Input: ${input}`)
      if (result) parts.push(`Result: ${result}`)
      lines.push(parts.join('\n'))
      continue
    }

    if (msg.role === 'system' && msg.content) {
      lines.push(`\n_[system: ${truncate(msg.content, 300)}]_`)
    }
  }

  return lines.join('\n').trim()
}

/**
 * Decide if a conversation has enough substance to distill.
 */
export function conversationHasSubstance(
  messages: ConversationMessage[],
  minUserTurns = 1,
  minTotalChars = 200,
): boolean {
  const userTurns = messages.filter((m) => m.role === 'user').length
  const assistantTurns = messages.filter(
    (m) => m.role === 'assistant' && !m.isThinking && m.content?.trim().length,
  ).length
  if (userTurns < minUserTurns || assistantTurns < 1) return false

  const total = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0)
  return total >= minTotalChars
}

function truncate(s: string | undefined, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  return `${s.slice(0, max)}…[truncated ${s.length - max}ch]`
}

function safeStringify(value: unknown, max: number): string {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value)
    return truncate(str, max)
  } catch {
    return '[unserializable]'
  }
}
