import type { ConversationMessage } from '@domains/activity/types/activity.types'

interface ContentBlock {
  type: string
  text?: string
  thinking?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
}

interface SdkLikeMessage {
  type: string
  message?: { content?: ContentBlock[] | string }
  subtype?: string
}

/**
 * Pure, one-shot converter from the raw SDK message stream to the
 * ConversationMessage[] shape the librarian transcript formatter expects.
 * Mirrors the semantics of the RuntimeTracer without any side effects.
 */
export function sdkMessagesToConversation(messages: unknown[]): ConversationMessage[] {
  const out: ConversationMessage[] = []
  const toolInputs = new Map<string, { name: string; input: unknown }>()

  messages.forEach((raw, idx) => {
    const m = raw as SdkLikeMessage
    const baseId = `sdk:${idx}`
    const ts = new Date()

    if (m.type === 'system') {
      out.push({
        id: baseId,
        role: 'system',
        content: `System: ${m.subtype ?? 'init'}`,
        timestamp: ts,
      })
      return
    }

    if (m.type === 'assistant') {
      const content = Array.isArray(m.message?.content)
        ? (m.message?.content as ContentBlock[])
        : []
      content.forEach((block, bIdx) => {
        if (block.type === 'text' && typeof block.text === 'string') {
          out.push({
            id: `${baseId}:${bIdx}`,
            role: 'assistant',
            content: block.text,
            timestamp: ts,
          })
        } else if (block.type === 'thinking' && typeof block.thinking === 'string') {
          out.push({
            id: `${baseId}:${bIdx}`,
            role: 'assistant',
            content: block.thinking,
            timestamp: ts,
            isThinking: true,
          })
        } else if (block.type === 'tool_use' && block.id && block.name) {
          toolInputs.set(block.id, { name: block.name, input: block.input })
        }
      })
      return
    }

    if (m.type === 'user') {
      const rawContent = m.message?.content
      if (typeof rawContent === 'string' && rawContent.length > 0) {
        out.push({ id: baseId, role: 'user', content: rawContent, timestamp: ts })
        return
      }
      const content = Array.isArray(rawContent) ? rawContent : []
      content.forEach((block, bIdx) => {
        if (block.type === 'text' && typeof block.text === 'string') {
          out.push({
            id: `${baseId}:${bIdx}`,
            role: 'user',
            content: block.text,
            timestamp: ts,
          })
        } else if (block.type === 'tool_result' && block.tool_use_id) {
          const meta = toolInputs.get(block.tool_use_id)
          if (meta) {
            out.push({
              id: `${baseId}:${bIdx}`,
              role: 'tool',
              content: '',
              timestamp: ts,
              toolName: meta.name,
              toolInput: meta.input,
              toolResult: block.content,
            })
            toolInputs.delete(block.tool_use_id)
          }
        }
      })
    }
  })

  return out
}
