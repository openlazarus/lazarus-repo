import { createLogger } from '@utils/logger'
import type { IEmailConversationRepository } from '@domains/email/repository/email-conversation.repository.interface'
import { emailConversationRepository } from '@domains/email/repository/email-conversation.repository'
import { summarizeConversation } from '@domains/conversation/service/conversation-summary.service'
import type { ConversationMessage } from '../../conversation/types/conversation.types'
import type {
  ConversationRow,
  ConversationContext,
  EmailThreadingHeaders,
  StoreMessageData,
  ThreadHeaders,
} from '@domains/email/types/email-conversation.types'
import type { IEmailConversationService } from './email-conversation.service.interface'

// Re-export types for convenience
export type { EmailThreadingHeaders, ConversationContext, StoreMessageData, ThreadHeaders }

const logger = createLogger('email-conversation')

// ---------------------------------------------------------------------------
// Thread-matching strategy pattern
// ---------------------------------------------------------------------------

/**
 * A single thread-detection strategy.
 * Returns a ConversationRow if it finds a match, null otherwise.
 */
type ThreadMatchStrategy = (
  repo: IEmailConversationRepository,
  workspaceId: string,
  agentId: string,
  headers: EmailThreadingHeaders,
) => Promise<{ row: ConversationRow; method: string } | null>

/**
 * Strategy 1 — Match In-Reply-To header against known message IDs.
 */
const matchByInReplyTo: ThreadMatchStrategy = async (repo, workspaceId, agentId, headers) => {
  if (!headers.inReplyTo) return null
  const row = await repo.findConversationByMessageId(workspaceId, agentId, headers.inReplyTo)
  return row ? { row, method: 'in-reply-to' } : null
}

/**
 * Strategy 2 — Match any References header against known message IDs.
 */
const matchByReferences: ThreadMatchStrategy = async (repo, workspaceId, agentId, headers) => {
  if (!headers.references || headers.references.length === 0) return null
  for (const ref of headers.references) {
    const row = await repo.findConversationByMessageId(workspaceId, agentId, ref)
    if (row) return { row, method: 'references' }
  }
  return null
}

/**
 * Strategy 3 — Fallback: match normalized subject + sender within 7-day window.
 */
const matchBySubjectSender: ThreadMatchStrategy = async (repo, workspaceId, agentId, headers) => {
  const normalized = normalizeSubject(headers.subject)
  if (!normalized) return null

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const row = await repo.findConversationBySubjectSender(
    workspaceId,
    agentId,
    normalized,
    headers.senderEmail,
    sevenDaysAgo,
  )
  return row ? { row, method: 'subject-sender' } : null
}

/**
 * Ordered list of strategies. First match wins.
 * Add new strategies here — they'll be tried in array order.
 */
const THREAD_MATCH_STRATEGIES: ThreadMatchStrategy[] = [
  matchByInReplyTo,
  matchByReferences,
  matchBySubjectSender,
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Strip Re:/Fwd:/Fw: prefixes, collapse whitespace, lowercase.
 */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(\s*(re|fwd?|fw)\s*:\s*)+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EmailConversationService implements IEmailConversationService {
  constructor(private repo: IEmailConversationRepository = emailConversationRepository) {}

  /**
   * Find or create a conversation for an incoming email.
   * Runs each strategy in order; first match wins. If none match, creates new.
   */
  async getOrCreateConversation(
    workspaceId: string,
    agentId: string,
    headers: EmailThreadingHeaders,
  ): Promise<ConversationContext> {
    try {
      // Run strategies in priority order
      for (const strategy of THREAD_MATCH_STRATEGIES) {
        const match = await strategy(this.repo, workspaceId, agentId, headers)
        if (match) {
          logger.info(
            { conversationId: match.row.id, method: match.method },
            'Matched conversation',
          )
          return {
            id: match.row.id,
            isNewConversation: false,
            messageCount: match.row.message_count,
            threadRootMessageId: match.row.thread_root_message_id ?? undefined,
          }
        }
      }

      // No match — create new conversation
      const normalized = normalizeSubject(headers.subject)
      const id = await this.repo.createConversation({
        workspace_id: workspaceId,
        agent_id: agentId,
        thread_root_message_id: headers.emailMessageId || null,
        normalized_subject: normalized || null,
        sender_email: headers.senderEmail,
        message_count: 0,
      })

      logger.info({ conversationId: id }, 'Created new email conversation')
      return {
        id,
        isNewConversation: true,
        messageCount: 0,
        threadRootMessageId: headers.emailMessageId,
      }
    } catch (err) {
      logger.error({ err }, 'Failed to get/create email conversation')
      throw err
    }
  }

  /**
   * Store a message (inbound or outbound) in a conversation.
   */
  async storeMessage(conversationId: string, data: StoreMessageData): Promise<string> {
    const msgId = await this.repo.insertMessage({
      email_conversation_id: conversationId,
      email_message_id: data.emailMessageId || null,
      in_reply_to: data.inReplyTo || null,
      reference_ids: data.referenceIds || [],
      sender_email: data.senderEmail,
      sender_name: data.senderName || null,
      subject: data.subject,
      content: data.content,
      is_from_bot: data.isFromBot,
      direction: data.direction,
      attachments: data.attachments || [],
      ses_message_id: data.sesMessageId || null,
    })

    await this.repo.incrementMessageCount(conversationId)

    logger.info(
      { messageId: msgId, conversationId, direction: data.direction },
      'Stored email message',
    )
    return msgId
  }

  /**
   * Build formatted conversation history for agent prompt injection.
   */
  async buildConversationHistory(
    conversationId: string,
    options: { limit?: number } = {},
  ): Promise<string> {
    const messages = await this.repo.getMessages(conversationId, options.limit || 20)
    if (messages.length === 0) return ''

    const firstInbound = messages.find((m) => !m.is_from_bot)
    const senderLabel = firstInbound?.sender_email || 'the sender'

    const lines = [
      '## Email Conversation History',
      `The following emails are from your conversation with ${senderLabel}. Use this context to maintain continuity.\n`,
    ]

    for (const msg of messages) {
      const time = new Date(msg.created_at).toISOString().replace('T', ' ').substring(0, 16)
      const speaker = msg.is_from_bot ? 'You' : msg.sender_name || msg.sender_email
      const content =
        msg.content && msg.content.length > 2000
          ? msg.content.substring(0, 2000) + '...'
          : msg.content || '[no content]'
      lines.push(`[${time}] ${speaker}: ${content}`)

      // Include attachment references so the agent knows what was shared
      const attachments = Array.isArray(msg.attachments) ? msg.attachments : []
      for (const att of attachments) {
        const sizeLabel = att.size ? ` (${formatBytes(att.size)})` : ''
        lines.push(`  [Attached: ${att.filename}${sizeLabel}]`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Build an AI-generated summary of an email conversation for prompt injection.
   * Falls back to last 5 messages if summarization fails.
   */
  async buildConversationSummary(
    conversationId: string,
    options: { limit?: number } = {},
  ): Promise<{ summary: string; senderLabel: string }> {
    const messages = await this.repo.getMessages(conversationId, options.limit || 20)
    if (messages.length === 0) return { summary: '', senderLabel: '' }

    const firstInbound = messages.find((m) => !m.is_from_bot)
    const senderLabel = firstInbound?.sender_email || 'the sender'

    const conversationMessages: ConversationMessage[] = messages.map((msg) => ({
      speaker: msg.is_from_bot ? 'You' : msg.sender_name || msg.sender_email,
      content: msg.content || '[no content]',
      timestamp: new Date(msg.created_at).toISOString().replace('T', ' ').substring(0, 16),
    }))

    const summary = await summarizeConversation(conversationMessages)
    return { summary, senderLabel }
  }

  /**
   * Get RFC 2822 threading headers for composing an outbound reply.
   */
  async getThreadHeaders(conversationId: string): Promise<ThreadHeaders> {
    const [messageIds, threadRoot] = await Promise.all([
      this.repo.getMessageIds(conversationId),
      this.repo.getThreadRoot(conversationId),
    ])

    return {
      inReplyTo: messageIds[0] || undefined, // most recent
      references: [...messageIds].reverse(), // oldest first per RFC 2822
      threadRootMessageId: threadRoot ?? undefined,
    }
  }
}

export const emailConversationService: IEmailConversationService = new EmailConversationService()
