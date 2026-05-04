import type { AgentTrigger } from '@domains/agent/types/trigger.types'
import { agentWhatsAppStorage } from '@domains/whatsapp/repository/agent-whatsapp-storage'
import { emailConversationService } from '@domains/email/service/email-conversation.service'
import { generateConversationTitle } from '@domains/conversation/service/conversation-title.service'
import { summarizeConversation } from '@domains/conversation/service/conversation-summary.service'
import type { ConversationMessage } from '../../../conversation/types/conversation.types'
import type { PromptBuildResult } from '@domains/agent/types/agent.types'
import { createLogger } from '@utils/logger'
const log = createLogger('prompt-builders')

interface PromptBuilderContext {
  trigger: AgentTrigger
  triggerData: any
  triggerTask?: string
}

type PromptBuilder = (ctx: PromptBuilderContext) => Promise<PromptBuildResult>

// ---------------------------------------------------------------------------
// Platform-specific builders
// ---------------------------------------------------------------------------

/**
 * Prepends the custom trigger task if one is configured.
 */
function prependTask(prompt: string, triggerTask?: string): string {
  if (triggerTask && triggerTask !== 'Execute triggered task') {
    return `${triggerTask}\n\n---\n\n${prompt}`
  }
  return prompt
}

/**
 * Wraps generateConversationTitle with a fallback so callers don't need try/catch.
 */
async function safeGenerateTitle(
  text: string,
  platform: 'email' | 'chat',
  opts: { userName: string },
  fallback: string,
): Promise<string> {
  try {
    return await generateConversationTitle(text, platform, opts)
  } catch {
    return fallback
  }
}

const buildEmailPrompt: PromptBuilder = async ({ triggerData, triggerTask }) => {
  const from = triggerData.from as string
  const subject = (triggerData.subject as string) || '(no subject)'
  const body = triggerData.body || triggerData.textContent || '(no content)'

  const emailContext = {
    from,
    subject,
    preview: (triggerData.body?.substring(0, 100) || '') as string,
    messageId: triggerData.messageId,
  }

  // If this is a reply, load conversation summary instead of full history
  let conversationSummaryBlock = ''
  if (triggerData.emailConversationId && triggerData.isReply) {
    try {
      const { summary, senderLabel } = await emailConversationService.buildConversationSummary(
        triggerData.emailConversationId,
        { limit: 20 },
      )
      if (summary) {
        conversationSummaryBlock = [
          '## Conversation Summary',
          `You have been exchanging emails with ${senderLabel}. Here is a summary of the conversation:\n`,
          summary,
          `\n> If you need the full email thread, use the \`email_conversation_history\` tool with conversationId="${triggerData.emailConversationId}".`,
        ].join('\n')
      }
    } catch (err) {
      log.error({ err: err }, 'Failed to load email conversation summary')
    }
  }

  const messageId = triggerData.messageId as string | undefined

  let emailBody = `Email received from ${from}:\n\nSubject: ${subject}\n\n${body}`
  if (conversationSummaryBlock) {
    emailBody = `${conversationSummaryBlock}\n---\n\n## New Email\n${emailBody}`
  }

  const replyInstruction = messageId
    ? `If you determine a reply is appropriate, use the email_reply tool with messageId="${messageId}" to respond to the sender.`
    : `If you determine a reply is appropriate, use the email_list tool first to find the messageId, then use email_reply to respond.`

  emailBody += `\n\n---\n${replyInstruction}\n\nIMPORTANT: Do NOT use markdown formatting in your email replies. Emails do not render markdown. Instead use plain text formatting: blank lines for paragraphs, dashes for lists, and UPPERCASE or *asterisks* sparingly for emphasis.`

  const prompt = prependTask(emailBody, triggerTask)

  const conversationTitle = await safeGenerateTitle(
    body || subject,
    'email',
    { userName: from },
    subject || `Email from ${from}`,
  )

  return {
    prompt,
    platformSource: 'email',
    conversationTitle,
    executionTitle: `📧 Email from ${from}`,
    executionDescription: subject || 'No subject',
    platformMetadata: { userName: from },
    trackerMetadata: { emailContext },
    userMessage: subject ? `${subject} — ${body}` : body,
  }
}

const buildWhatsAppPrompt: PromptBuilder = async ({ trigger, triggerData, triggerTask }) => {
  const senderPhone = triggerData.from as string
  const senderName = (triggerData.senderName || senderPhone) as string
  const messageText = (triggerData.textContent ||
    triggerData.caption ||
    '[media message]') as string

  // Load recent conversation and summarize it instead of dumping raw history
  const conversationSummary = await loadWhatsAppSummary(
    trigger.agentId,
    trigger.workspaceId,
    senderPhone,
    senderName,
    triggerData.messageId,
  )

  let body = `WhatsApp message from ${senderName} (${senderPhone}):\n\n${messageText}`
  if (conversationSummary) {
    body = `${conversationSummary}\n---\n\n## New Message\n${body}`
  }

  body += `\n\n---\nIMPORTANT: You MUST reply to this WhatsApp message using the whatsapp_send tool with to="${senderPhone}". Always reply back to the user.\n\nIf you encounter ANY error or cannot complete the requested task, you MUST still send a WhatsApp message to ${senderPhone} explaining what went wrong and what needs to happen to fix it. The user contacted you via WhatsApp — they must always get a response on WhatsApp, even if it's an error message. Never just log the error internally without notifying the user on WhatsApp.`

  const prompt = prependTask(body, triggerTask)

  const conversationTitle = await safeGenerateTitle(
    messageText,
    'chat',
    { userName: senderName },
    `WhatsApp from ${senderName}`,
  )

  return {
    prompt,
    platformSource: 'whatsapp',
    conversationTitle,
    executionTitle: `💬 WhatsApp from ${senderName}`,
    executionDescription: messageText.substring(0, 100),
    platformMetadata: {
      userName: senderName,
      phoneNumberId: triggerData.phoneNumberId,
      senderPhone: triggerData.senderPhone || triggerData.from,
    },
    userMessage: messageText,
  }
}

// ---------------------------------------------------------------------------
// WhatsApp history helper
// ---------------------------------------------------------------------------

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_HISTORY_MESSAGES = 50

async function loadWhatsAppSummary(
  agentId: string,
  workspaceId: string,
  senderPhone: string,
  senderName: string,
  currentMessageId?: string,
): Promise<string> {
  try {
    const since = Date.now() - HISTORY_WINDOW_MS

    const allMessages = await agentWhatsAppStorage.listMessages(agentId, workspaceId, {
      contact: senderPhone,
      since,
      limit: MAX_HISTORY_MESSAGES,
    })

    const recentMessages = allMessages
      .filter((m) => m.id !== currentMessageId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (recentMessages.length === 0) return ''

    const conversationMessages: ConversationMessage[] = recentMessages.map((msg) => ({
      speaker: msg.metadata.direction === 'outbound' ? 'You' : senderName,
      content: msg.textContent || msg.media?.caption || `[${msg.type}]`,
      timestamp: new Date(msg.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }))

    const summary = await summarizeConversation(conversationMessages)

    const lines = [
      '## Conversation Summary',
      `You have been chatting with ${senderName} (${senderPhone}). Here is a summary of your recent conversation:\n`,
      summary,
      `\n> If you need the full conversation history, use the \`whatsapp_conversation_history\` tool with contactPhone="${senderPhone}".`,
    ]

    return lines.join('\n')
  } catch (error) {
    log.error({ err: error }, 'Failed to load WhatsApp conversation summary')
    return ''
  }
}

const buildWebhookPrompt: PromptBuilder = async ({ triggerData, triggerTask }) => {
  const source = triggerData.source || 'external app'
  const body = JSON.stringify(triggerData.body || triggerData, null, 2)

  let prompt = `Webhook signal received from ${source}:\n\n${body}`
  prompt = prependTask(prompt, triggerTask)

  return {
    prompt,
    executionTitle: `Webhook signal from ${source}`,
    executionDescription: triggerData.event || 'App signal received',
    userMessage: triggerData.event || `Signal from ${source}`,
  }
}

// ---------------------------------------------------------------------------
// Registry & entry point
// ---------------------------------------------------------------------------

/**
 * Map of trigger type → prompt builder.
 * Add new platform integrations here.
 */
const platformBuilders: Record<string, PromptBuilder> = {
  email: buildEmailPrompt,
  whatsapp: buildWhatsAppPrompt,
  webhook: buildWebhookPrompt,
}

/**
 * Detect email-like triggers whose type isn't explicitly 'email'
 * (legacy: email triggers identified by triggerData shape).
 */
function looksLikeEmail(triggerData: any): boolean {
  return !!(triggerData?.from && triggerData?.subject)
}

/**
 * Build an execution prompt for an agent trigger.
 *
 * 1. Looks up a platform-specific builder by `trigger.type`.
 * 2. Falls back to email detection by triggerData shape (legacy compat).
 * 3. Falls back to a generic prompt with raw trigger data.
 */
export async function buildTriggerPrompt(
  trigger: AgentTrigger,
  triggerData: any,
  triggerTask?: string,
): Promise<PromptBuildResult> {
  const ctx: PromptBuilderContext = { trigger, triggerData, triggerTask }

  // Explicit type match
  const builder = platformBuilders[trigger.type]
  if (builder) {
    return builder(ctx)
  }

  // Legacy detection: email triggers identified by data shape (from + subject)
  if (looksLikeEmail(triggerData)) {
    return buildEmailPrompt(ctx)
  }

  // Generic fallback — preserves original behavior for unknown trigger types
  let prompt = triggerTask || 'Execute triggered task'
  if (triggerData) {
    prompt += `\n\nTrigger Data: ${JSON.stringify(triggerData, null, 2)}`
  }

  return { prompt }
}
