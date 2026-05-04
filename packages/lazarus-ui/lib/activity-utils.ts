import { ChatMessage } from '@/components/ui/chat/types'
import { Log } from '@/model/log'

/**
 * Convert activity log conversation to ChatMessage format.
 * Tool messages are converted to background-action variant.
 * Shared between activity-detail-viewer and execution-card.
 */
export function convertToChatMessages(log: Log): ChatMessage[] {
  if (!log.conversation || log.conversation.length === 0) {
    return []
  }

  const messages: ChatMessage[] = []

  for (const msg of log.conversation) {
    // Skip system messages
    if (msg.role === 'system') continue

    if (msg.role === 'tool' && msg.toolName) {
      // Convert tool messages to background-action variant
      messages.push({
        id: msg.id,
        role: 'assistant',
        timestamp: new Date(msg.timestamp),
        variant: {
          type: 'background-action',
          title: `used ${msg.toolName}`,
          status: 'success',
          description: msg.toolInput
            ? typeof msg.toolInput === 'string'
              ? msg.toolInput
              : JSON.stringify(msg.toolInput)
            : undefined,
          expandable: !!msg.toolResult,
          details: msg.toolResult
            ? typeof msg.toolResult === 'string'
              ? msg.toolResult
              : JSON.stringify(msg.toolResult, null, 2)
            : undefined,
        },
      })
    } else if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        id: msg.id,
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(msg.timestamp),
        variant: {
          type: 'text',
          content: msg.content,
          status: 'sent',
        },
      })
    }
  }

  return messages
}
