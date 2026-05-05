import type { AgentTrigger } from '@domains/agent/types/trigger.types'
import { generateConversationTitle } from '@domains/conversation/service/conversation-title.service'
import type { PromptBuildResult } from '@domains/agent/types/agent.types'

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

  const messageId = triggerData.messageId as string | undefined

  let emailBody = `Email received from ${from}:\n\nSubject: ${subject}\n\n${body}`
  if (triggerData.emailConversationId && triggerData.isReply) {
    emailBody += `\n\n---\nThis is a reply in an ongoing thread (conversationId="${triggerData.emailConversationId}"). If you need prior messages to respond well, fetch them with the \`email_conversation_history\` tool. Otherwise answer the new email above directly.`
  }

  const replyInstruction = messageId
    ? `If you determine a reply is appropriate, use the email_reply tool with messageId="${messageId}" to respond to the sender.`
    : `If you determine a reply is appropriate, use the email_list tool first to find the messageId, then use email_reply to respond.`

  emailBody += `\n\n---\n${replyInstruction}\n\nNo markdown in email body — use plain text (blank lines for paragraphs, dashes for lists, UPPERCASE or *asterisks* for emphasis).`

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

const buildWhatsAppPrompt: PromptBuilder = async ({ triggerData, triggerTask }) => {
  const senderPhone = triggerData.from as string
  const senderName = (triggerData.senderName || senderPhone) as string
  const messageText = (triggerData.textContent ||
    triggerData.caption ||
    '[media message]') as string

  let body = `WhatsApp message from ${senderName} (${senderPhone}):\n\n${messageText}`

  body += `\n\n---\nIf you need prior messages with this contact to respond well, fetch them with the \`whatsapp_conversation_history\` tool (contactPhone="${senderPhone}"). Otherwise answer the new message above directly.`

  body += `\n\n---\nReply via \`whatsapp_send\` (to="${senderPhone}"). On error, send the error message there too — the user expects a WhatsApp response either way.`

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
