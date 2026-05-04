import Anthropic from '@anthropic-ai/sdk'
import type { ConversationMessage } from '@domains/conversation/types/conversation.types'
import { createLogger } from '@utils/logger'

const logger = createLogger('conversation-summary')

const anthropic = new Anthropic()

const SUMMARY_SYSTEM_PROMPT = `You are a conversation summarizer. Given a conversation transcript, produce a summary in the same language as the conversation. The summary length should be proportional to the conversation's complexity and importance.

For short/simple conversations (1-5 messages), write 2-3 sentences.
For medium conversations (5-20 messages), write a detailed paragraph covering all key points.
For long/complex conversations (20+ messages), write a comprehensive summary with multiple paragraphs if needed.

Include:
- Key topics discussed
- Specific data, numbers, or details that were shared
- Requests made and their current status (fulfilled, pending, in progress)
- Decisions reached and commitments made
- Any pending items or open questions
- Important context the agent needs to continue the conversation naturally

Output ONLY the summary text. No headers, labels, or formatting — just the summary.`

const FALLBACK_MESSAGE_COUNT = 5

function formatMessagesForSummary(messages: ConversationMessage[]): string {
  return messages.map((m) => `[${m.timestamp}] ${m.speaker}: ${m.content}`).join('\n')
}

function buildFallbackSummary(messages: ConversationMessage[]): string {
  const recent = messages.slice(-FALLBACK_MESSAGE_COUNT)
  return formatMessagesForSummary(recent)
}

function calculateMaxTokens(messageCount: number): number {
  if (messageCount <= 5) return 300
  if (messageCount <= 20) return 600
  return 1000
}

export async function summarizeConversation(
  messages: ConversationMessage[],
  options?: { maxTokens?: number },
): Promise<string> {
  if (messages.length === 0) return ''

  const maxTokens = options?.maxTokens ?? calculateMaxTokens(messages.length)
  const transcript = formatMessagesForSummary(messages)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')

    return text || buildFallbackSummary(messages)
  } catch (error) {
    logger.error({ err: error }, 'Failed to summarize conversation, using fallback')
    return buildFallbackSummary(messages)
  }
}
