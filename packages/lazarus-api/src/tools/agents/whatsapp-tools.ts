import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import { z } from 'zod'
import {
  agentWhatsAppStorage,
  WhatsAppMessageFilter,
} from '@domains/whatsapp/repository/agent-whatsapp-storage'
import { kapsoService } from '@domains/whatsapp/service/kapso-service'
import { ApiError } from '@errors/api-errors'
import { whatsAppPhoneRepository } from '@domains/whatsapp/repository/whatsapp-phone.repository'
import { getMetaErrorGuidance } from '@domains/whatsapp/service/whatsapp-status'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getExecutionContext } from '@domains/execution/service/execution-context'
import { getContentType } from '@utils/mime-types'
import { createLogger } from '@utils/logger'

const log = createLogger('whatsapp-tools')

/**
 * WhatsApp tools for agents to read, send, and manage WhatsApp messages
 *
 * These tools allow agents to:
 * - List messages in their WhatsApp inbox
 * - Read specific messages
 * - Send text and media messages
 * - Reply to received messages
 * - Mark messages as read
 *
 * Uses Claude Agent SDK format for MCP tool integration.
 *
 * IMPORTANT: These tools read agent context (agentId, workspaceId, userId)
 * from environment variables set by WorkspaceAgentExecutor.
 */

/**
 * Get agent context from environment variables
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
 * Get agent's WhatsApp phone number configuration from database
 */
async function getAgentWhatsAppConfig(
  workspaceId: string,
  agentId: string,
): Promise<{
  phoneNumber: string
  phoneNumberId: string
  displayName?: string
} | null> {
  return whatsAppPhoneRepository.getAgentWhatsAppConfig(workspaceId, agentId)
}

/**
 * Load agent config to check WhatsApp restriction settings
 */
async function isWhatsAppRestrictedToContacts(
  workspacePath: string,
  agentId: string,
): Promise<boolean> {
  try {
    const configPath = path.join(workspacePath, '.agents', agentId, 'config.agent.json')
    const content = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(content)

    // Default to false (allow sending to anyone) if not set
    return config.whatsapp?.restrictToContacts === true
  } catch (error) {
    log.info({ err: error }, 'Could not load agent config, defaulting to unrestricted mode')
    return false
  }
}

/**
 * WhatsApp error visitor — each visitor inspects the error and returns
 * a tool response if it can handle it, or null to pass to the next visitor.
 */
type WhatsAppErrorVisitor = (
  error: unknown,
) => { success: false; error: string; userAction?: string } | null

const whatsAppErrorVisitors: WhatsAppErrorVisitor[] = [
  // Visitor: Known Meta/Kapso API errors (status map lookup)
  (error) => {
    if (!(error instanceof ApiError) || !('errorBody' in error)) return null
    const { statusCode, errorBody } = error as ApiError & { errorBody: string }
    const guidance = getMetaErrorGuidance(statusCode, errorBody)
    if (!guidance) return null
    return {
      success: false as const,
      error: `${guidance.title}: ${guidance.guidance}`,
      userAction: guidance.userAction,
    }
  },
]

/**
 * Run error through the visitor chain. Returns the first match or a generic fallback.
 */
function visitWhatsAppError(error: unknown, fallbackPrefix: string): object {
  for (const visitor of whatsAppErrorVisitors) {
    const result = visitor(error)
    if (result) return result
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return { success: false, error: `${fallbackPrefix}: ${message}` }
}

export const whatsappTools = [
  // List WhatsApp messages
  tool(
    'whatsapp_list',
    'List WhatsApp messages in your inbox. You can filter by unread status, sender, or message type.',
    {
      unreadOnly: z
        .boolean()
        .optional()
        .describe('If true, only show unread messages. Default: false'),
      from: z.string().optional().describe('Filter by sender phone number (partial match)'),
      direction: z.enum(['inbound', 'outbound']).optional().describe('Filter by message direction'),
      type: z
        .enum(['text', 'image', 'document', 'audio', 'video', 'location', 'contacts', 'sticker'])
        .optional()
        .describe('Filter by message type'),
      limit: z.number().optional().describe('Maximum number of messages to return. Default: 20'),
      offset: z
        .number()
        .optional()
        .describe('Number of messages to skip (for pagination). Default: 0'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        const filter: WhatsAppMessageFilter = {
          unreadOnly: args.unreadOnly || false,
          from: args.from,
          direction: args.direction,
          type: args.type,
          limit: args.limit || 20,
          offset: args.offset || 0,
        }

        const messages = await agentWhatsAppStorage.listMessages(agentId, workspaceId, filter)

        // Return simplified message list
        const messageList = messages.map((msg) => ({
          id: msg.id,
          from: msg.sender,
          senderName: msg.senderName,
          to: msg.recipient,
          timestamp: msg.timestamp,
          type: msg.type,
          preview:
            msg.textContent?.substring(0, 100) ||
            (msg.transcription
              ? `[voice] ${msg.transcription.substring(0, 100)}`
              : `[${msg.type}]`),
          transcription: msg.transcription ? msg.transcription.substring(0, 200) : undefined,
          hasMedia: !!msg.media,
          read: msg.metadata.read,
          direction: msg.metadata.direction,
        }))

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  messages: messageList,
                  count: messageList.length,
                  filter,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'whatsapp_list' }, 'Failed to list WhatsApp messages')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to list WhatsApp messages: ${error.message}`,
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

  // Read a specific WhatsApp message
  tool(
    'whatsapp_read',
    'Read a specific WhatsApp message by its ID. Returns the full message content including media information.',
    {
      messageId: z.string().describe('The message ID to read (from whatsapp_list)'),
      markAsRead: z
        .boolean()
        .optional()
        .describe('Mark the message as read after reading. Default: true'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        const message = await agentWhatsAppStorage.getMessage(agentId, workspaceId, args.messageId)

        if (!message) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Message not found: ${args.messageId}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Mark as read if requested
        if (args.markAsRead !== false) {
          await agentWhatsAppStorage.markAsRead(agentId, workspaceId, args.messageId)
          message.metadata.read = true
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: {
                    id: message.id,
                    from: message.sender,
                    senderName: message.senderName,
                    to: message.recipient,
                    timestamp: message.timestamp,
                    type: message.type,
                    textContent: message.textContent,
                    transcription: message.transcription,
                    media: message.media
                      ? {
                          mimeType: message.media.mimeType,
                          filename: message.media.filename,
                          caption: message.media.caption,
                          storagePath: message.media.storagePath,
                        }
                      : undefined,
                    location: message.location,
                    contacts: message.contacts,
                    read: message.metadata.read,
                    direction: message.metadata.direction,
                    conversationId: message.metadata.conversationId,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'whatsapp_read' }, 'Failed to read WhatsApp message')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to read message: ${error.message}`,
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

  // Get media attachment
  tool(
    'whatsapp_get_media',
    'Get the content of a media attachment from a WhatsApp message. Returns base64-encoded data.',
    {
      storagePath: z.string().describe('The storage path of the media (from whatsapp_read)'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        const buffer = await agentWhatsAppStorage.getMediaAttachment(
          agentId,
          workspaceId,
          args.storagePath,
        )

        if (!buffer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Media not found: ${args.storagePath}`,
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
                  media: {
                    storagePath: args.storagePath,
                    size: buffer.length,
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
        log.error({ err: error, tool: 'whatsapp_get_media' }, 'Failed to get WhatsApp media')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to get media: ${error.message}`,
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

  // Mark message as read
  tool(
    'whatsapp_mark_read',
    'Mark a WhatsApp message as read.',
    {
      messageId: z.string().describe('The message ID to mark as read'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        await agentWhatsAppStorage.markAsRead(agentId, workspaceId, args.messageId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Message ${args.messageId} marked as read`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error(
          { err: error, tool: 'whatsapp_mark_read' },
          'Failed to mark WhatsApp message as read',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to mark message as read: ${error.message}`,
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

  // Send WhatsApp message
  tool(
    'whatsapp_send',
    'Send a WhatsApp message to a phone number. Supports text messages and media.',
    {
      to: z.string().describe('Recipient phone number in E.164 format (e.g., +1234567890)'),
      text: z.string().optional().describe('Message text content'),
      mediaUrl: z
        .string()
        .optional()
        .describe('URL to media file (image, document, audio, video) to send'),
      mediaId: z
        .string()
        .optional()
        .describe('Media ID from whatsapp_upload_media (alternative to mediaUrl)'),
      mediaType: z
        .enum(['image', 'document', 'audio', 'video'])
        .optional()
        .describe('Type of media being sent'),
      mediaCaption: z.string().optional().describe('Caption for media message'),
      mediaFilename: z.string().optional().describe('Filename for document attachments'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId, userId } = getAgentContext()
        const workspacePath = getExecutionContext().workspacePath

        // Check if Kapso is configured
        if (!kapsoService.isConfigured()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      'WhatsApp integration is not configured. Please set up Kapso API credentials.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Get agent's WhatsApp configuration
        const whatsappConfig = await getAgentWhatsAppConfig(workspaceId, agentId)
        if (!whatsappConfig) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      'WhatsApp is not configured for this agent. Please connect a phone number first.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Validate phone number
        if (!kapsoService.isValidPhoneNumber(args.to)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Invalid phone number format: ${args.to}. Use E.164 format (e.g., +1234567890)`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Check restriction settings
        if (workspacePath) {
          const isRestricted = await isWhatsAppRestrictedToContacts(workspacePath, agentId)
          if (isRestricted) {
            // TODO: Implement contact list validation
            log.info('Contact restriction check would happen here')
          }
        }

        // Require either text or media
        const hasMedia = (args.mediaUrl || args.mediaId) && args.mediaType
        if (!args.text && !hasMedia) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Either text or media (mediaUrl/mediaId + mediaType) must be provided',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const normalizedTo = kapsoService.normalizePhoneNumber(args.to)

        if (hasMedia) {
          // Send media message (supports both URL and uploaded media ID)
          await kapsoService.sendMediaMessage(whatsappConfig.phoneNumberId, normalizedTo, {
            type: args.mediaType!,
            url: args.mediaUrl,
            id: args.mediaId,
            caption: args.mediaCaption,
            filename: args.mediaFilename,
          })
        } else if (args.text) {
          // Send text message
          await kapsoService.sendTextMessage(whatsappConfig.phoneNumberId, normalizedTo, args.text)
        }

        // Save outbound message record
        const sentMessage = await agentWhatsAppStorage.saveOutboundMessage(agentId, workspaceId, {
          userId,
          sender: whatsappConfig.phoneNumber,
          recipient: normalizedTo,
          timestamp: new Date().toISOString(),
          type: hasMedia ? args.mediaType! : 'text',
          textContent: args.text,
          media: hasMedia
            ? {
                id: args.mediaId || '',
                mimeType: getMimeTypeForMedia(args.mediaType, args.mediaFilename),
                caption: args.mediaCaption,
                storagePath: '',
              }
            : undefined,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Message sent successfully to ${normalizedTo}`,
                  sentMessage: {
                    id: sentMessage.id,
                    to: normalizedTo,
                    from: whatsappConfig.phoneNumber,
                    type: sentMessage.type,
                    sentAt: sentMessage.timestamp,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'whatsapp_send' }, 'Failed to send WhatsApp message')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                visitWhatsAppError(error, 'Failed to send WhatsApp message'),
                null,
                2,
              ),
            },
          ],
        }
      }
    },
  ),

  // Reply to a WhatsApp message
  tool(
    'whatsapp_reply',
    'Reply to a WhatsApp message you received. This sends a message back to the sender.',
    {
      messageId: z.string().describe('The message ID you are replying to'),
      text: z.string().describe('Your reply message'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId, userId } = getAgentContext()

        // Check if Kapso is configured
        if (!kapsoService.isConfigured()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'WhatsApp integration is not configured.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Get the original message
        const originalMessage = await agentWhatsAppStorage.getMessage(
          agentId,
          workspaceId,
          args.messageId,
        )

        if (!originalMessage) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Original message not found: ${args.messageId}`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Get agent's WhatsApp configuration
        const whatsappConfig = await getAgentWhatsAppConfig(workspaceId, agentId)
        if (!whatsappConfig) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'WhatsApp is not configured for this agent.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Send reply to original sender
        await kapsoService.sendTextMessage(
          whatsappConfig.phoneNumberId,
          originalMessage.sender,
          args.text,
        )

        // Save outbound message record
        const sentMessage = await agentWhatsAppStorage.saveOutboundMessage(agentId, workspaceId, {
          userId,
          sender: whatsappConfig.phoneNumber,
          recipient: originalMessage.sender,
          timestamp: new Date().toISOString(),
          type: 'text',
          textContent: args.text,
          metadata: {
            conversationId: originalMessage.metadata.conversationId,
          },
        })

        // Mark original message as read
        await agentWhatsAppStorage.markAsRead(agentId, workspaceId, args.messageId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Reply sent successfully to ${originalMessage.sender}`,
                  sentMessage: {
                    id: sentMessage.id,
                    to: originalMessage.sender,
                    from: whatsappConfig.phoneNumber,
                    sentAt: sentMessage.timestamp,
                    inReplyTo: args.messageId,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'whatsapp_reply' }, 'Failed to send WhatsApp reply')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(visitWhatsAppError(error, 'Failed to send reply'), null, 2),
            },
          ],
        }
      }
    },
  ),

  // Send a template message (works outside 24-hour window)
  tool(
    'whatsapp_send_template',
    'Send a WhatsApp template message to a phone number. Template messages can be sent at any time, even outside the 24-hour conversation window. Use whatsapp_list_templates to see available templates.',
    {
      to: z.string().describe('Recipient phone number in E.164 format (e.g., +1234567890)'),
      templateName: z.string().describe('Name of the approved message template'),
      languageCode: z.string().optional().describe("Template language code (default: 'en')"),
      bodyVariables: z
        .array(z.string())
        .optional()
        .describe('Variables to fill in the template body (in order)'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId, userId } = getAgentContext()

        if (!kapsoService.isConfigured()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      'WhatsApp integration is not configured. Please set up Kapso API credentials.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const whatsappConfig = await getAgentWhatsAppConfig(workspaceId, agentId)
        if (!whatsappConfig) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      'WhatsApp is not configured for this agent. Please connect a phone number first.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        if (!kapsoService.isValidPhoneNumber(args.to)) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Invalid phone number format: ${args.to}. Use E.164 format (e.g., +1234567890)`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const normalizedTo = kapsoService.normalizePhoneNumber(args.to)
        const languageCode = args.languageCode || 'en'

        // Build components array from body variables
        const components: any[] = []
        if (args.bodyVariables && args.bodyVariables.length > 0) {
          components.push({
            type: 'body',
            parameters: args.bodyVariables.map((v) => ({
              type: 'text',
              text: v,
            })),
          })
        }

        await kapsoService.sendTemplateMessage(
          whatsappConfig.phoneNumberId,
          normalizedTo,
          args.templateName,
          languageCode,
          components.length > 0 ? components : undefined,
        )

        // Save outbound message record
        const sentMessage = await agentWhatsAppStorage.saveOutboundMessage(agentId, workspaceId, {
          userId,
          sender: whatsappConfig.phoneNumber,
          recipient: normalizedTo,
          timestamp: new Date().toISOString(),
          type: 'template' as any,
          textContent: `[Template: ${args.templateName}]`,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Template message '${args.templateName}' sent successfully to ${normalizedTo}`,
                  sentMessage: {
                    id: sentMessage.id,
                    to: normalizedTo,
                    from: whatsappConfig.phoneNumber,
                    type: 'template',
                    templateName: args.templateName,
                    sentAt: sentMessage.timestamp,
                  },
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error(
          { err: error, tool: 'whatsapp_send_template' },
          'Failed to send WhatsApp template message',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to send template message: ${error.message}`,
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

  // List available message templates
  tool(
    'whatsapp_list_templates',
    'List available WhatsApp message templates. Templates are pre-approved messages that can be sent outside the 24-hour conversation window.',
    {},
    async () => {
      try {
        const { agentId, workspaceId } = getAgentContext()

        if (!kapsoService.isConfigured()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'WhatsApp integration is not configured.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const businessAccountId = await whatsAppPhoneRepository.getBusinessAccountId(
          workspaceId,
          agentId,
        )

        if (!businessAccountId) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      'Business Account ID not available. The WhatsApp Business Account may not be fully set up.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const templates = await kapsoService.listMessageTemplates(businessAccountId)

        if (templates.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    templates: [],
                    count: 0,
                    note: 'No templates found. This could mean no templates are configured in Meta Business Manager, or Kapso does not support the template listing endpoint.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const formattedTemplates = templates.map((t) => ({
          name: t.name,
          status: t.status,
          language: t.language,
          category: t.category,
          hasBodyVariables:
            t.components?.some((c: any) => c.type === 'BODY' && c.text?.includes('{{')) || false,
        }))

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  templates: formattedTemplates,
                  count: formattedTemplates.length,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error(
          { err: error, tool: 'whatsapp_list_templates' },
          'Failed to list WhatsApp templates',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to list templates: ${error.message}`,
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

  // Upload a workspace file as WhatsApp media
  tool(
    'whatsapp_upload_media',
    'Upload a file from the workspace to WhatsApp so it can be sent as an attachment. Returns a media ID to use with whatsapp_send.',
    {
      filePath: z
        .string()
        .describe("Path to the file within the workspace (e.g., 'reports/summary.docx')"),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()
        const workspacePath = getExecutionContext().workspacePath

        if (!kapsoService.isConfigured()) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'WhatsApp integration is not configured.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const whatsappConfig = await getAgentWhatsAppConfig(workspaceId, agentId)
        if (!whatsappConfig) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'WhatsApp is not configured for this agent.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        // Resolve file path within workspace
        const fullPath = path.resolve(workspacePath || '', args.filePath)

        // Security: ensure file is within workspace
        if (workspacePath && !fullPath.startsWith(path.resolve(workspacePath))) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'File path must be within the workspace directory.',
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const fileBuffer = await fs.readFile(fullPath)
        const filename = path.basename(args.filePath)
        const mimeType = getContentType(filename)

        const result = await kapsoService.uploadMedia(
          whatsappConfig.phoneNumberId,
          fileBuffer,
          mimeType,
          filename,
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  mediaId: result.id,
                  filename,
                  mimeType,
                  size: fileBuffer.length,
                  usage: `Use whatsapp_send with mediaId: "${result.id}", mediaType: "document", mediaFilename: "${filename}"`,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error({ err: error, tool: 'whatsapp_upload_media' }, 'Failed to upload WhatsApp media')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to upload media: ${error.message}`,
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

  // Get full conversation history with a contact
  tool(
    'whatsapp_conversation_history',
    'Get the full conversation history with a specific WhatsApp contact. Use this when you need detailed context from past messages beyond the summary provided in your prompt.',
    {
      contactPhone: z.string().describe('Phone number of the contact (e.g., +1234567890)'),
      hoursBack: z.number().optional().describe('How many hours of history to fetch. Default: 24'),
      limit: z.number().optional().describe('Max messages to return. Default: 50'),
    },
    async (args) => {
      try {
        const { agentId, workspaceId } = getAgentContext()
        const hoursBack = args.hoursBack ?? 24
        const limit = args.limit ?? 50
        const since = Date.now() - hoursBack * 60 * 60 * 1000

        const messages = await agentWhatsAppStorage.listMessages(agentId, workspaceId, {
          contact: args.contactPhone,
          since,
          limit,
        })

        if (messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    messages: [],
                    count: 0,
                    note: `No messages found with ${args.contactPhone} in the last ${hoursBack} hours.`,
                  },
                  null,
                  2,
                ),
              },
            ],
          }
        }

        const sorted = messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )

        const formatted = sorted.map((msg) => {
          const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
          const speaker =
            msg.metadata.direction === 'outbound' ? 'You' : msg.senderName || msg.sender
          const content = msg.textContent || msg.media?.caption || `[${msg.type}]`
          return `[${time}] ${speaker}: ${content}`
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  history: formatted.join('\n'),
                  count: sorted.length,
                  hoursBack,
                },
                null,
                2,
              ),
            },
          ],
        }
      } catch (error: any) {
        log.error(
          { err: error, tool: 'whatsapp_conversation_history' },
          'Failed to load WhatsApp conversation history',
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Failed to load conversation history: ${error.message}`,
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

export const whatsappToolsServer = createSdkMcpServer({
  name: 'whatsapp-tools',
  version: '1.0.0',
  tools: whatsappTools,
})

export function createWhatsappToolsServer() {
  return createSdkMcpServer({ name: 'whatsapp-tools', version: '1.0.0', tools: whatsappTools })
}

/**
 * Helper to get MIME type — uses filename extension when available,
 * falls back to a default per media category.
 */
function getMimeTypeForMedia(mediaType?: string, filename?: string): string {
  if (filename) {
    return getContentType(filename)
  }
  const defaults: Record<string, string> = {
    image: 'image/jpeg',
    document: 'application/pdf',
    audio: 'audio/mpeg',
    video: 'video/mp4',
  }
  return (mediaType && defaults[mediaType]) || 'application/octet-stream'
}
