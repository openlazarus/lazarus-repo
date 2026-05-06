import { Request, Response } from 'express'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { agentLookupService } from '@domains/agent/service/agent-lookup.service'
import { s3EmailFetcher } from '@domains/email/service/s3-email-fetcher'
import { agentEmailStorage } from '@domains/email/repository/agent-email-storage'
import { AgentStatusService } from '@domains/agent/service/agent-status.service'
import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import { emailConversationService } from '@domains/email/service/email-conversation.service'
import { sesEmailSender } from '@domains/email/service/ses-email-sender'
import { creditsGuard, INSUFFICIENT_CREDITS_MESSAGE } from '@shared/services/credits-guard'
import * as path from 'path'
import * as fs from 'fs/promises'
import { loadAgentEmailAuthConfig, isEmailAuthorized } from '@utils/email-authorization'
import { createLogger } from '@utils/logger'
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from '@errors/api-errors'

const logger = createLogger('email-router')

const STORAGE_BASE = process.env.STORAGE_BASE_PATH || process.env.STORAGE_BASE || './storage'
const agentStatusService = AgentStatusService.getInstance()
const triggerManager = new AgentTriggerManager()

function getWorkspacePath(workspaceId: string, settings?: { path?: string } | null): string {
  if (settings?.path) {
    return settings.path
  }
  return path.join(STORAGE_BASE, 'workspaces', workspaceId)
}

class EmailRouterController {
  async route(req: Request, res: Response) {
    try {
      const payload = req.body

      logger.info(
        {
          messageId: payload.messageId,
          to: payload.to,
          from: payload.from,
          subject: payload.subject,
        },
        'Email routing webhook received',
      )

      if (!payload.messageId || !payload.to || !payload.from) {
        logger.error('Missing required fields in webhook payload')
        throw new BadRequestError('Missing required fields', 'Required: messageId, to, from')
      }

      const recipient = payload.to
      const [agentId, fullDomain] = recipient.split('@')
      const subdomain = fullDomain.split('.')[0]
      const workspaceSlug = subdomain

      if (!workspaceSlug || !agentId) {
        logger.error({ recipient }, 'Could not parse workspace slug or agent ID from recipient')
        throw new BadRequestError('Invalid recipient email format')
      }

      logger.info({ workspaceSlug, agentId, fullDomain }, 'Extracted routing info')

      logger.info({ workspaceSlug }, 'Looking up workspace by slug')
      const workspace = await workspaceRepository.getWorkspaceBySlug(workspaceSlug)

      if (!workspace) {
        logger.error({ workspaceSlug }, 'Workspace not found')
        throw new NotFoundError('Workspace', workspaceSlug)
      }

      logger.info(
        { id: workspace.id, name: workspace.name, slug: workspace.slug },
        'Workspace found',
      )

      logger.info({ agentId, workspaceId: workspace.id }, 'Validating agent exists')
      const agentMetadata = await agentLookupService.getAgentMetadata(workspace.id, agentId)

      if (!agentMetadata || !agentMetadata.enabled) {
        logger.error({ agentId, workspaceId: workspace.id }, 'Agent not found or disabled')
        throw new NotFoundError('Agent', agentId)
      }

      const agentDisplayName = agentMetadata.name || agentId
      logger.info({ agentId, displayName: agentDisplayName }, 'Agent validated')

      const senderDomain = payload.from.split('@').pop()?.toLowerCase() || ''
      const internalDomain = (process.env.EMAIL_DOMAIN || 'mail.example.com').toLowerCase()
      const isInternalSender = senderDomain.endsWith(internalDomain)

      if (!isInternalSender) {
        try {
          const workspacePathForAuth = getWorkspacePath(
            workspace.id,
            workspace.settings as { path?: string } | null,
          )
          const authConfig = await loadAgentEmailAuthConfig(workspacePathForAuth, agentId)

          if (authConfig.restrictToWorkspaceMembers) {
            const authorized = await isEmailAuthorized(workspace.id, payload.from, authConfig)

            if (!authorized) {
              logger.warn(
                { sender: payload.from, agentId, workspaceId: workspace.id },
                'Inbound email rejected: sender not authorized (not a workspace member or on allow list)',
              )
              throw new ForbiddenError(
                'Sender not authorized',
                `${payload.from} is not a workspace member or on the agent's allowed external emails list.`,
              )
            }
          }
        } catch (authError) {
          logger.warn(
            { err: authError, sender: payload.from, agentId },
            'Email authorization check failed — allowing email through (fail-open)',
          )
        }
      }

      let parsedEmail
      let emailContent = ''
      let htmlContent = ''
      let attachments: any[] = []

      try {
        logger.info({ messageId: payload.messageId }, 'Fetching email from S3')
        parsedEmail = await s3EmailFetcher.fetchAndParseEmail(payload.messageId)

        emailContent = parsedEmail.textContent || ''
        htmlContent = parsedEmail.htmlContent || ''
        attachments = parsedEmail.attachments.map((att, _index) => ({
          filename: att.filename,
          content_type: att.contentType,
          size: att.size,
          storage_path: `${payload.messageId}/${att.filename}`,
          content_base64: att.content.toString('base64'),
        }))

        logger.info(
          {
            textLength: emailContent.length,
            htmlLength: htmlContent.length,
            attachmentCount: attachments.length,
          },
          'Email parsed',
        )
      } catch (parseError) {
        logger.error({ err: parseError }, 'Failed to fetch/parse email from S3')
        emailContent = 'Email content could not be retrieved from S3.'
      }

      const emailData = {
        trigger_event: 'email_received',
        project: {
          identifier: workspace.slug ?? '',
          name: workspace.name,
          domain: fullDomain,
        },
        email: {
          message_id: payload.messageId,
          sender: payload.from,
          subject: payload.subject || '(No Subject)',
          date: payload.timestamp,
          recipient: payload.to,
          text_content: emailContent,
          html_content: htmlContent,
        },
        attachments: attachments,
        full_domain: fullDomain,
        subdomain: workspaceSlug,
      }

      const workspacePath = getWorkspacePath(
        workspace.id,
        workspace.settings as { path?: string } | null,
      )

      try {
        const existingEmail = await agentEmailStorage.getEmail(
          agentId,
          workspace.id,
          emailData.email.message_id,
        )

        if (existingEmail) {
          logger.warn(
            { messageId: emailData.email.message_id, agentId },
            'Email already exists - skipping duplicate webhook',
          )
          return res.json({
            success: true,
            message: 'Email already processed (duplicate webhook)',
            duplicate: true,
            workspace: {
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
            },
            agent: agentId,
            email: {
              messageId: payload.messageId,
            },
          })
        }

        const savedEmail = await agentEmailStorage.saveIncomingEmail(
          agentId,
          workspace.id,
          emailData,
        )

        logger.info({ emailId: savedEmail.id, agentId }, 'Saved email to agent inbox')

        let emailConversationId: string | undefined
        let isEmailReply = false
        let threadMessageCount = 0

        try {
          const conversationCtx = await emailConversationService.getOrCreateConversation(
            workspace.id,
            agentId,
            {
              inReplyTo: parsedEmail?.inReplyTo,
              references: parsedEmail?.references,
              emailMessageId: parsedEmail?.emailMessageId,
              subject: emailData.email.subject,
              senderEmail: emailData.email.sender,
            },
          )

          emailConversationId = conversationCtx.id
          isEmailReply = !conversationCtx.isNewConversation
          threadMessageCount = conversationCtx.messageCount

          await emailConversationService.storeMessage(conversationCtx.id, {
            emailMessageId: parsedEmail?.emailMessageId,
            inReplyTo: parsedEmail?.inReplyTo,
            referenceIds: parsedEmail?.references,
            senderEmail: emailData.email.sender,
            subject: emailData.email.subject,
            content: emailData.email.text_content || '',
            isFromBot: false,
            direction: 'inbound',
            attachments: attachments.map((a) => ({ filename: a.filename, size: a.size })),
          })

          logger.info(
            { emailConversationId, isEmailReply, threadMessageCount },
            'Email conversation threading complete',
          )
        } catch (convError) {
          logger.error({ err: convError }, 'Failed to process email conversation threading')
        }

        try {
          agentStatusService.broadcastToWorkspace(workspace.id, {
            type: 'email_received',
            agentId,
            email: {
              messageId: emailData.email.message_id,
              sender: emailData.email.sender,
              subject: emailData.email.subject,
              attachmentCount: attachments.length,
            },
            timestamp: new Date().toISOString(),
          })
        } catch (wsError) {
          logger.error({ err: wsError }, 'Failed to broadcast WebSocket')
        }

        const emailTriggers: any[] = []

        try {
          const agentPath = path.join(workspacePath, '.agents', agentId)
          const triggersDir = path.join(agentPath, 'triggers')
          const triggersFile = path.join(agentPath, 'triggers.json')
          const seenIds = new Set<string>()

          try {
            const files = await fs.readdir(triggersDir)
            for (const file of files) {
              if (file.endsWith('.json')) {
                try {
                  const content = await fs.readFile(path.join(triggersDir, file), 'utf-8')
                  const trigger = JSON.parse(content)
                  if (trigger.type === 'email' && trigger.enabled) {
                    emailTriggers.push(trigger)
                    if (trigger.id) seenIds.add(trigger.id)
                  }
                } catch (parseErr) {
                  logger.warn({ err: parseErr, file, agentId }, 'Failed to parse trigger file')
                }
              }
            }
          } catch (dirError: any) {
            if (dirError.code !== 'ENOENT') {
              logger.warn({ err: dirError, agentId }, 'Failed to read triggers/ directory')
            }
          }

          if (emailTriggers.length === 0) {
            try {
              const triggersContent = await fs.readFile(triggersFile, 'utf-8')
              const allTriggers = JSON.parse(triggersContent)
              const oldFormatTriggers = (Array.isArray(allTriggers) ? allTriggers : []).filter(
                (trigger: any) => trigger.type === 'email' && trigger.enabled,
              )
              emailTriggers.push(...oldFormatTriggers)
            } catch (readError: any) {
              if (readError.code !== 'ENOENT') {
                logger.warn({ err: readError, agentId }, 'Failed to read triggers.json for agent')
              }
            }
          }

          if (
            emailTriggers.length === 0 &&
            agentMetadata.email?.enabled &&
            agentMetadata.autoTriggerEmail !== false
          ) {
            logger.info(
              { agentId },
              'No email triggers found but autoTriggerEmail is enabled — synthesizing catch-all trigger',
            )
            emailTriggers.push({
              id: 'auto-email-catchall',
              type: 'email',
              enabled: true,
              config: {
                event: 'email_received',
                description: 'Auto-trigger for email-enabled agent',
              },
            })
          }

          if (emailTriggers.length > 0) {
            logger.info(
              { count: emailTriggers.length, agentId },
              'Found email trigger(s) for agent',
            )

            const tasksWithNames = emailTriggers
              .filter((t: any) => t.config?.task)
              .map((t: any, i: number) => ({
                index: i + 1,
                name: t.name || `Task ${t.id}`,
                task: t.config.task,
              }))

            let combinedTask: string | undefined
            if (tasksWithNames.length > 1) {
              const taskList = tasksWithNames
                .map((t) => `### Task ${t.index}: "${t.name}"\n${t.task}`)
                .join('\n\n')
              combinedTask = `You have the following email tasks configured. Analyze the email below and execute ONLY the task that best matches the email content. If none of the specific tasks match, handle the email normally (read it and reply if appropriate).\n\n${taskList}`
            } else if (tasksWithNames.length === 1) {
              combinedTask = tasksWithNames[0]!.task
            }

            const primaryTrigger = emailTriggers[0]

            try {
              logger.info(
                {
                  triggerId: primaryTrigger.id,
                  triggerCount: emailTriggers.length,
                  tasksProvided: tasksWithNames.length,
                  agentId,
                },
                'Executing consolidated email trigger',
              )

              const fullTrigger = {
                ...primaryTrigger,
                agentId,
                workspaceId: workspace.id,
                userId: workspace.user_id,
                name: primaryTrigger.name || primaryTrigger.config?.description || `Email trigger`,
                config: {
                  ...primaryTrigger.config,
                  ...(combinedTask ? { task: combinedTask } : {}),
                },
              }

              const triggerPayload = {
                triggerId: primaryTrigger.id,
                agentId,
                workspaceId: workspace.id,
                userId: workspace.user_id,
                messageId: emailData.email.message_id,
                from: emailData.email.sender,
                subject: emailData.email.subject,
                body: emailData.email.text_content || '',
                textContent: emailData.email.text_content || '',
                htmlContent: emailData.email.html_content || '',
                receivedAt: emailData.email.date,
                emailPath: `.agents/${agentId}/inbox/${emailData.email.message_id}`,
                contentFilePath: `.agents/${agentId}/inbox/${emailData.email.message_id}/content.json`,
                hasAttachments: attachments.length > 0,
                attachmentCount: attachments.length,
                emailConversationId,
                isReply: isEmailReply,
                threadMessageCount,
              }

              // Credits check — if insufficient, reply via email and skip execution
              const agentEmail = `${agentId}@${workspaceSlug}.${process.env.EMAIL_DOMAIN || 'mail.example.com'}`
              const creditsCheck = await creditsGuard(
                workspace.id,
                async () => {
                  await sesEmailSender.sendReply(
                    agentId,
                    workspace.id,
                    workspace.user_id,
                    {
                      from: emailData.email.sender,
                      messageId: emailData.email.message_id,
                      subject: emailData.email.subject,
                    },
                    { text: INSUFFICIENT_CREDITS_MESSAGE },
                    agentEmail,
                  )
                },
                'email',
              )
              if (!creditsCheck.allowed) {
                try {
                  await agentEmailStorage.markAsRead(agentId, workspace.id, savedEmail.id)
                } catch {
                  /* best-effort */
                }
                return res.json({
                  success: true,
                  status: 'skipped',
                  reason: 'insufficient_credits',
                })
              }

              const execution = await triggerManager.executeAgentTrigger(
                fullTrigger,
                triggerPayload,
              )

              if (execution.status === 'failed') {
                logger.warn(
                  { triggerId: primaryTrigger.id, error: execution.error },
                  'Email trigger execution failed',
                )
              } else {
                logger.info({ triggerId: primaryTrigger.id }, 'Email trigger executed successfully')
              }

              try {
                await agentEmailStorage.markAsRead(agentId, workspace.id, savedEmail.id)
                logger.info(
                  { emailId: savedEmail.id },
                  'Marked email as read to prevent re-triggering',
                )
              } catch (markReadError) {
                logger.error({ err: markReadError }, 'Failed to mark email as read')
              }
            } catch (triggerError) {
              logger.error(
                { err: triggerError, triggerId: primaryTrigger.id },
                'Failed to execute consolidated trigger',
              )
            }
          } else {
            logger.warn(
              { agentId, sender: emailData.email.sender, subject: emailData.email.subject },
              'Email received but no email triggers configured or matched for agent',
            )
          }
        } catch (triggerError) {
          logger.error({ err: triggerError }, 'Failed to process triggers')
        }

        // Email-level activity is captured via the downstream agent.run spans per trigger.
        return res.json({
          success: true,
          message: 'Email routed successfully',
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
          },
          agent: agentId,
          email: {
            from: payload.from,
            subject: payload.subject,
            messageId: payload.messageId,
            textLength: emailContent.length,
            htmlLength: htmlContent.length,
            attachmentCount: attachments.length,
          },
        })
      } catch (storageError) {
        logger.error({ err: storageError }, 'Failed to store email')
        throw new InternalServerError(
          storageError instanceof Error ? storageError.message : 'Failed to store email',
        )
      }
    } catch (error) {
      logger.error({ err: error }, 'Error routing email')
      throw error
    }
  }

  async healthCheck(_req: Request, res: Response) {
    try {
      const healthy = await workspaceRepository.healthCheck()

      if (!healthy) {
        throw new Error('Database health check failed')
      }

      return res.json({
        status: 'healthy',
        service: 'email-router',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      throw new InternalServerError(
        error instanceof Error ? error.message : 'Email router health check failed',
      )
    }
  }
}

export const emailRouterController = new EmailRouterController()
