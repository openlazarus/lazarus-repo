import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import { parseOffice } from 'officeparser'
import { agentEmailStorage, EmailFilter } from '@domains/email/repository/agent-email-storage'
import type { EmailAttachment } from '../../domains/email/types/email.types'
import { sesEmailSender } from '@domains/email/service/ses-email-sender'
import { emailConversationService } from '@domains/email/service/email-conversation.service'
import {
  loadAgentEmailAuthConfig,
  validateAuthorizedEmails,
  isEmailAuthorized,
} from '@utils/email-authorization'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { workspaceConfigService } from '@domains/workspace/service/workspace-config.service'
import { createLogger } from '@utils/logger'

const log = createLogger('email-tools')

/**
 * Email tools for agents to read, send, and manage their inbox
 *
 * These tools allow agents to:
 * - List emails in their inbox
 * - Read specific emails
 * - Access email attachments
 * - Mark emails as read
 * - Send new emails (external via SES, internal via direct inbox routing)
 * - Reply to emails
 * - List other agents in the workspace
 *
 * Uses Claude Agent SDK format for MCP tool integration.
 *
 * INTERNAL ROUTING: When sending to *@*.lazarusconnect.com, messages are
 * routed directly to the recipient agent's inbox without using SES.
 *
 * IMPORTANT: These tools read agent context (agentId, workspaceId, userId)
 * from environment variables set by WorkspaceAgentExecutor. The agent does
 * not need to pass these explicitly.
 */

/**
 * Get agent context from environment variables
 * @throws Error if context is not available
 */
function getAgentContext(): { agentId: string; workspaceId: string; userId: string } {
  const ctx = getExecutionContext()
  const agentId = ctx.agentId
  const workspaceId = ctx.workspaceId
  const userId = ctx.userId

  if (!agentId || !workspaceId || !userId) {
    throw new Error(
      'Agent context not available. Missing environment variables: ' +
        `AGENT_ID=${agentId}, WORKSPACE_ID=${workspaceId}, USER_ID=${userId}`,
    )
  }

  return { agentId, workspaceId, userId }
}

/**
 * Get workspace slug from workspace config
 * Returns slug to construct agent email: {agentId}@{workspaceSlug}.lazarusconnect.com
 */
async function getWorkspaceSlug(workspaceId: string): Promise<string> {
  try {
    const workspacePath = getExecutionContext().workspacePath

    if (!workspacePath) {
      throw new Error('WORKSPACE_PATH not set in environment')
    }

    // Get workspace config (auto-creates if missing)
    const config = await workspaceConfigService.getConfig(workspacePath, workspaceId)

    if (!config.slug) {
      throw new Error('Workspace slug not found in config')
    }

    return config.slug
  } catch (error) {
    log.error({ err: error }, 'getWorkspaceSlug failed')
    throw error
  }
}

/**
 * Check if an email address is an internal lazarusconnect.com address
 * Returns { isInternal: true, agentId, workspaceSlug } or { isInternal: false }
 */
function parseInternalAddress(
  email: string,
): { isInternal: true; agentId: string; workspaceSlug: string } | { isInternal: false } {
  const match = email.match(/^([^@]+)@([^.]+)\.lazarusconnect\.com$/i)
  if (match) {
    return { isInternal: true, agentId: match[1]!, workspaceSlug: match[2]! }
  }
  return { isInternal: false }
}

/**
 * Internal message format (compatible with external email format)
 */
export const emailTools = [
  // List emails in inbox
  tool(
    'email_list',
    'List emails in your inbox. You can filter by unread status, sender, or subject.',
    {
      unreadOnly: z
        .boolean()
        .optional()
        .describe('If true, only show unread emails. Default: false'),
      from: z.string().optional().describe('Filter by sender email address (partial match)'),
      subject: z
        .string()
        .optional()
        .describe('Filter by email subject (partial match, case-insensitive)'),
      limit: z.number().optional().describe('Maximum number of emails to return. Default: 20'),
      offset: z
        .number()
        .optional()
        .describe('Number of emails to skip (for pagination). Default: 0'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        const filter: EmailFilter = {
          unreadOnly: args.unreadOnly || false,
          from: args.from,
          subject: args.subject,
          limit: args.limit || 20,
          offset: args.offset || 0,
        }

        const emails = await agentEmailStorage.listEmails(agentId, workspaceId, filter)

        // Return simplified email list (don't include full content)
        const emailList = emails.map((email) => ({
          id: email.id,
          from: email.sender,
          subject: email.subject,
          date: email.date,
          hasAttachments: email.attachments.length > 0,
          attachmentCount: email.attachments.length,
          read: email.metadata.read,
          received: email.metadata.received,
        }))

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  emails: emailList,
                  count: emailList.length,
                  filter,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'email_list' }, 'Failed to list emails')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to list emails: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Read a specific email
  tool(
    'email_read',
    'Read a specific email by its message ID. Returns the full email content including text and HTML.',
    {
      messageId: z.string().describe('The message ID of the email to read (from email_list)'),
      markAsRead: z
        .boolean()
        .optional()
        .describe('Mark the email as read after reading. Default: true'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        const email = await agentEmailStorage.getEmail(agentId, workspaceId, args.messageId)

        if (!email) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Email not found: ${args.messageId}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Mark as read if requested (default: true)
        if (args.markAsRead !== false) {
          await agentEmailStorage.markAsRead(agentId, workspaceId, args.messageId)
          email.metadata.read = true
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  email: {
                    id: email.id,
                    from: email.sender,
                    subject: email.subject,
                    date: email.date,
                    textContent: email.textContent,
                    htmlContent: email.htmlContent,
                    attachments: email.attachments.map((att) => ({
                      filename: att.filename,
                      contentType: att.contentType,
                      size: att.size,
                      path: att.storagePath,
                    })),
                    read: email.metadata.read,
                    received: email.metadata.received,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'email_read' }, 'Failed to read email')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to read email: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Get email attachment
  tool(
    'email_attachment',
    'Get the content of an email attachment. Office documents (.docx, .pptx, .xlsx, .pdf, .odt, .odp, .ods) are auto-extracted to plain text so the agent can read them directly. All other formats are returned as base64-encoded bytes.',
    {
      storagePath: z.string().describe('The storage path of the attachment (from email_read)'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        const buffer = await agentEmailStorage.getAttachment(agentId, workspaceId, args.storagePath)

        if (!buffer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Attachment not found: ${args.storagePath}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Office documents are binary (ZIP-of-XML for OOXML/ODF, or PDF) and the
        // LLM cannot read them as base64. Extract to plain text server-side.
        const lowerPath = args.storagePath.toLowerCase()
        const officeExtensions = ['.docx', '.pptx', '.xlsx', '.pdf', '.odt', '.odp', '.ods']
        const isOfficeDoc = officeExtensions.some((ext) => lowerPath.endsWith(ext))
        if (isOfficeDoc) {
          try {
            const parsed = await parseOffice(buffer)
            const text = parsed.toText()
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      success: true,
                      attachment: {
                        storagePath: args.storagePath,
                        size: buffer.length,
                        format: 'text',
                        sourceFormat: parsed.type,
                        text,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            }
          } catch (extractError: any) {
            log.warn(
              { err: extractError, storagePath: args.storagePath },
              'Office document extraction failed, falling back to base64',
            )
            // fall through to base64
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  attachment: {
                    storagePath: args.storagePath,
                    size: buffer.length,
                    format: 'base64',
                    contentBase64: buffer.toString('base64'),
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'email_attachment' }, 'Failed to get email attachment')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to get attachment: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Mark email as read
  tool(
    'email_mark_read',
    'Mark an email as read without reading its full content.',
    {
      messageId: z.string().describe('The message ID of the email to mark as read'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        await agentEmailStorage.markAsRead(agentId, workspaceId, args.messageId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Email ${args.messageId} marked as read`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'email_mark_read' }, 'Failed to mark email as read')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to mark email as read: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Send new email (handles both external via SES and internal via direct inbox routing)
  tool(
    'email_send',
    'Send an email to EXTERNAL recipients only (outside the workspace) via AWS SES. NEVER use this tool to contact other agents in your workspace — use `ask_agent` or `delegate_task` from agent-chat-tools instead.',
    {
      to: z
        .array(z.string())
        .describe(
          'Array of EXTERNAL recipient email addresses. Do NOT use lazarusconnect.com addresses — use ask_agent/delegate_task for agent communication.',
        ),
      subject: z.string().describe('Email subject line'),
      body: z
        .string()
        .describe(
          "Email body (plain text). Will be used as fallback for clients that don't support HTML.",
        ),
      bodyHtml: z
        .string()
        .optional()
        .describe(
          "Rich HTML email body (optional). When provided, this is the primary content displayed by email clients. The plain text 'body' field serves as the fallback.",
        ),
      cc: z
        .array(z.string())
        .optional()
        .describe('Array of CC recipient email addresses (optional)'),
      bcc: z
        .array(z.string())
        .optional()
        .describe('Array of BCC recipient email addresses (optional)'),
      priority: z
        .enum(['low', 'normal', 'high', 'urgent'])
        .optional()
        .describe('Message priority for internal messages (default: normal)'),
      attachments: z
        .array(
          z.object({
            path: z
              .string()
              .describe("File path relative to workspace root (e.g., './reports/summary.pdf')"),
            filename: z
              .string()
              .optional()
              .describe('Custom filename for the attachment (optional, defaults to file basename)'),
          }),
        )
        .optional()
        .describe(
          'Array of file attachments to include. Files must exist in the workspace. Max 10MB per file, 10MB total.',
        ),
    },
    async (args) => {
      try {
        const { agentId, workspaceId, userId } = getAgentContext()
        const workspacePath = getExecutionContext().workspacePath

        if (!workspacePath && args.attachments && args.attachments.length > 0) {
          throw new Error('WORKSPACE_PATH not set in environment, cannot attach files')
        }

        // Get workspace slug to construct email: {agentId}@{workspaceSlug}.lazarusconnect.com
        const workspaceSlug = await getWorkspaceSlug(workspaceId)
        const fromAddress = `${agentId}@${workspaceSlug}.${process.env.EMAIL_DOMAIN || 'mail.example.com'}`

        // Block internal (lazarusconnect.com) recipients — agents must use ask_agent/delegate_task
        const blockedAgents: string[] = []
        const externalRecipients: string[] = []

        for (const recipient of args.to) {
          const parsed = parseInternalAddress(recipient)
          if (parsed.isInternal && parsed.workspaceSlug === workspaceSlug) {
            blockedAgents.push(parsed.agentId)
          } else {
            externalRecipients.push(recipient)
          }
        }

        if (blockedAgents.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Cannot send email to workspace agents: ${blockedAgents.join(', ')}. Use \`ask_agent\` for questions or \`delegate_task\` to assign work to another agent. email_send is only for external recipients outside the workspace.`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Also block internal addresses in CC/BCC
        const ccBccInternal = [...(args.cc || []), ...(args.bcc || [])].filter((email) => {
          const p = parseInternalAddress(email)
          return p.isInternal && p.workspaceSlug === workspaceSlug
        })

        if (ccBccInternal.length > 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Cannot CC/BCC workspace agents: ${ccBccInternal.join(', ')}. Use \`ask_agent\` or \`delegate_task\` for agent communication. email_send is only for external recipients.`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Collect all external recipients for validation
        const allExternalRecipients = [
          ...externalRecipients,
          ...(args.cc || []),
          ...(args.bcc || []),
        ]

        // Check email restriction setting and validate external recipients
        if (allExternalRecipients.length > 0 && workspacePath) {
          const authConfig = await loadAgentEmailAuthConfig(workspacePath, agentId)

          if (authConfig.restrictToWorkspaceMembers) {
            // Validate all external recipients are workspace members or on allow list
            const validation = await validateAuthorizedEmails(
              workspaceId,
              allExternalRecipients,
              authConfig,
            )

            if (validation.invalid.length > 0) {
              // Block the entire send if any recipients are invalid
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        success: false,
                        error: `Cannot send email to non-workspace members: ${validation.invalid.join(', ')}. External emails can only be sent to workspace members or addresses on the agent's allowed external emails list. To allow specific external addresses, add them to the agent's allowed external emails. To allow sending to anyone, disable the "Restrict emails to workspace members" setting.`,
                      },
                      null,
                      2,
                    ),
                  },
                ],
              }
            }
          }
        }

        const results: { external: string[] } = { external: [] }

        // Send external emails via SES
        if (externalRecipients.length > 0) {
          const sentEmail = await sesEmailSender.sendEmail(agentId, workspaceId, userId, {
            from: fromAddress,
            to: externalRecipients,
            cc: args.cc,
            bcc: args.bcc,
            subject: args.subject,
            body: { text: args.body, ...(args.bodyHtml ? { html: args.bodyHtml } : {}) },
            replyTo: fromAddress,
            attachments: args.attachments as EmailAttachment[] | undefined,
            workspacePath: workspacePath,
          })
          results.external = externalRecipients

          // Store outbound message in conversation for threading
          try {
            for (const recipient of externalRecipients) {
              const convCtx = await emailConversationService.getOrCreateConversation(
                workspaceId,
                agentId,
                { subject: args.subject, senderEmail: recipient },
              )
              await emailConversationService.storeMessage(convCtx.id, {
                senderEmail: fromAddress,
                subject: args.subject,
                content: args.body,
                isFromBot: true,
                direction: 'outbound',
                sesMessageId: sentEmail.sesMessageId,
                attachments: (args.attachments || []).map((a) => ({
                  filename: a.filename || a.path,
                })),
              })
            }
          } catch (convError) {
            log.error({ err: convError }, 'Failed to store outbound conversation')
          }
        }

        // Build response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Sent externally to: ${results.external.join(', ')}`,
                  sentEmail: {
                    from: fromAddress,
                    to: args.to,
                    subject: args.subject,
                    sentAt: new Date().toISOString(),
                    externalDelivery: results.external,
                    attachmentCount: args.attachments?.length || 0,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'email_send' }, 'Failed to send email')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to send email: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Reply to email
  tool(
    'email_reply',
    'Reply to an email you received. This automatically sets the correct recipient and subject. Supports attaching workspace files to the reply.',
    {
      messageId: z
        .string()
        .describe(
          'The message ID of the email you are replying to (from email_list or email_read)',
        ),
      body: z
        .string()
        .describe(
          "Your reply message (plain text). Will be used as fallback for clients that don't support HTML.",
        ),
      bodyHtml: z
        .string()
        .optional()
        .describe(
          "Rich HTML reply body (optional). When provided, this is the primary content displayed by email clients. The plain text 'body' field serves as the fallback.",
        ),
      attachments: z
        .array(
          z.object({
            path: z
              .string()
              .describe("File path relative to workspace root (e.g., './reports/summary.pdf')"),
            filename: z
              .string()
              .optional()
              .describe('Custom filename for the attachment (optional, defaults to file basename)'),
          }),
        )
        .optional()
        .describe(
          'Array of file attachments to include in the reply. Files must exist in the workspace. Max 10MB per file, 10MB total.',
        ),
    },
    async (args) => {
      try {
        const { agentId, workspaceId, userId } = getAgentContext()

        // Get the original email
        const originalEmail = await agentEmailStorage.getEmail(agentId, workspaceId, args.messageId)

        if (!originalEmail) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Original email not found: ${args.messageId}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Get workspace slug to construct email: {agentId}@{workspaceSlug}.lazarusconnect.com
        const workspaceSlug = await getWorkspaceSlug(workspaceId)
        const agentEmail = `${agentId}@${workspaceSlug}.${process.env.EMAIL_DOMAIN || 'mail.example.com'}`

        // Check if reply is to an internal agent (bypass restriction) or external
        const parsedSender = parseInternalAddress(originalEmail.sender)

        // If external sender, check workspace member restriction + allow list
        if (!parsedSender.isInternal) {
          const workspacePath = getExecutionContext().workspacePath
          if (workspacePath) {
            const authConfig = await loadAgentEmailAuthConfig(workspacePath, agentId)

            if (authConfig.restrictToWorkspaceMembers) {
              const authorized = await isEmailAuthorized(
                workspaceId,
                originalEmail.sender,
                authConfig,
              )

              if (!authorized) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(
                        {
                          success: false,
                          error: `Cannot reply to ${originalEmail.sender}. Email replies can only be sent to workspace members or addresses on the agent's allowed external emails list. To allow specific external addresses, add them to the agent's allowed external emails. To allow sending to anyone, disable the "Restrict emails to workspace members" setting.`,
                        },
                        null,
                        2,
                      ),
                    },
                  ],
                }
              }
            }
          }
        }

        // Look up conversation for threading headers
        let threadingHeaders: { inReplyTo?: string; references?: string[] } | undefined
        let conversationId: string | undefined

        try {
          // Try to find existing conversation by the original email's message ID
          const convCtx = await emailConversationService.getOrCreateConversation(
            workspaceId,
            agentId,
            {
              inReplyTo: originalEmail.id,
              subject: originalEmail.subject,
              senderEmail: originalEmail.sender,
              emailMessageId: undefined, // outbound doesn't have its own yet
            },
          )
          conversationId = convCtx.id

          // Get threading headers for proper Gmail/Outlook threading
          const headers = await emailConversationService.getThreadHeaders(convCtx.id)
          threadingHeaders = {
            inReplyTo: headers.inReplyTo,
            references: headers.references,
          }
        } catch (convError) {
          log.error({ err: convError }, 'Failed to get conversation for threading')
          // Continue without threading — reply still goes out
        }

        const replyWorkspacePath = getExecutionContext().workspacePath
        if (!replyWorkspacePath && args.attachments && args.attachments.length > 0) {
          throw new Error('WORKSPACE_PATH not set in environment, cannot attach files')
        }

        // Send reply using SES with threading headers
        const sentEmail = await sesEmailSender.sendReply(
          agentId,
          workspaceId,
          userId,
          {
            from: originalEmail.sender,
            messageId: originalEmail.id,
            subject: originalEmail.subject,
          },
          {
            text: args.body,
            ...(args.bodyHtml ? { html: args.bodyHtml } : {}),
          },
          agentEmail,
          threadingHeaders,
          args.attachments as EmailAttachment[] | undefined,
          replyWorkspacePath,
        )

        // Store outbound message in conversation
        if (conversationId) {
          try {
            await emailConversationService.storeMessage(conversationId, {
              senderEmail: agentEmail,
              subject: originalEmail.subject.startsWith('Re: ')
                ? originalEmail.subject
                : `Re: ${originalEmail.subject}`,
              content: args.body,
              isFromBot: true,
              direction: 'outbound',
              sesMessageId: sentEmail.sesMessageId,
            })
          } catch (storeError) {
            log.error({ err: storeError }, 'Failed to store outbound message')
          }
        }

        // Mark original email as read
        await agentEmailStorage.markAsRead(agentId, workspaceId, args.messageId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Reply sent successfully to ${originalEmail.sender}`,
                  sentEmail: {
                    messageId: sentEmail.messageId,
                    from: sentEmail.from,
                    to: sentEmail.to,
                    subject: sentEmail.subject,
                    sentAt: sentEmail.sentAt,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'email_reply' }, 'Failed to send email reply')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to send reply: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Get full email conversation/thread history
  tool(
    'email_conversation_history',
    'Get the full email thread/conversation history. Use this when you need detailed context from past emails in a thread beyond the summary provided in your prompt.',
    {
      conversationId: z.string().describe('The email conversation/thread ID'),
      limit: z.number().optional().describe('Max messages to return. Default: 20'),
    },
    async (args) => {
      try {
        const limit = args.limit ?? 20
        const history = await emailConversationService.buildConversationHistory(
          args.conversationId,
          { limit },
        )

        if (!history) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    history: '',
                    count: 0,
                    note: `No messages found for conversation ${args.conversationId}.`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  history,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error(
          { err: error, tool: 'email_conversation_history' },
          'Failed to load email conversation history',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to load email conversation history: ${error.message}`,
                },
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),
]

export const emailToolsServer = createSdkMcpServer({
  name: 'email-tools',
  version: '1.0.0',
  tools: emailTools,
})

export function createEmailToolsServer() {
  return createSdkMcpServer({ name: 'email-tools', version: '1.0.0', tools: emailTools })
}
