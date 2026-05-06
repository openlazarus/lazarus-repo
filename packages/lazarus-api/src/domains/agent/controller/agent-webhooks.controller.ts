import { Request, Response } from 'express'
import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import type { EmailTriggerConfig } from '@domains/agent/types/trigger.types'
import {
  agentEmailStorage,
  EmailWebhookPayload,
} from '@domains/email/repository/agent-email-storage'
import { AgentStatusService } from '@domains/agent/service/agent-status.service'
import { s3EmailFetcher } from '@domains/email/service/s3-email-fetcher'
import { InternalServerError } from '@errors/api-errors'
import { createLogger } from '@utils/logger'
const log = createLogger('agent-webhooks')

const triggerManager = new AgentTriggerManager()
const agentStatusService = AgentStatusService.getInstance()

class AgentWebhooksController {
  async handleAgentEmail(req: Request, res: Response) {
    try {
      const agentId = req.params.agentId!
      const emailData: EmailWebhookPayload = req.body

      log.info(`Received email for agent ${agentId} from ${emailData.email?.sender}`)

      const workspaceId = (req.query.workspaceId as string) || 'unknown-workspace'
      const userId = (req.query.userId as string) || 'unknown-user'

      if (workspaceId === 'unknown-workspace' || userId === 'unknown-user') {
        log.error(`Missing workspaceId or userId for agent ${agentId}`)
        log.info({ data: req.query }, `Query params:`)
      }

      let parsedEmail
      try {
        log.info(`Fetching email from S3: ${emailData.email.message_id}`)
        parsedEmail = await s3EmailFetcher.fetchAndParseEmail(emailData.email.message_id)

        emailData.email.text_content = parsedEmail.textContent || ''
        emailData.email.html_content = parsedEmail.htmlContent || ''

        emailData.attachments = parsedEmail.attachments.map((att, _index) => ({
          filename: att.filename,
          content_type: att.contentType,
          size: att.size,
          storage_path: `${emailData.email.message_id}/${att.filename}`,
          content_base64: att.content.toString('base64'),
        }))

        log.info(
          `Email parsed - text: ${parsedEmail.textContent?.length || 0} chars, html: ${parsedEmail.htmlContent?.length || 0} chars, attachments: ${parsedEmail.attachments.length}`,
        )
      } catch (parseError) {
        log.error({ err: parseError }, `Failed to fetch/parse email from S3:`)
        emailData.email.text_content = ''
        emailData.email.html_content = ''
        emailData.attachments = []
      }

      try {
        const savedEmail = await agentEmailStorage.saveIncomingEmail(
          agentId,
          workspaceId,
          emailData,
        )

        log.info(`Saved email ${savedEmail.id} to agent ${agentId} inbox`)

        // Email arrival itself no longer creates an activity log; the agent's subsequent
        // run (when a trigger matches) produces an agent_runs row via the span processor.

        try {
          agentStatusService.broadcastToWorkspace(workspaceId, {
            type: 'email_received',
            agentId,
            email: {
              messageId: emailData.email.message_id,
              sender: emailData.email.sender,
              subject: emailData.email.subject,
              attachmentCount: emailData.attachments?.length || 0,
            },
            timestamp: new Date().toISOString(),
          })
        } catch (wsError) {
          log.error({ err: wsError }, 'Failed to broadcast WebSocket')
        }
      } catch (storageError: unknown) {
        log.error({ err: storageError }, 'Failed to store email')
        throw new InternalServerError(
          storageError instanceof Error ? storageError.message : 'Failed to store email',
        )
      }

      const allTriggers = await triggerManager.listTriggers(workspaceId, userId, agentId)
      const emailTriggers = allTriggers.filter(
        (t) => t.type === 'email' && t.agentId === agentId && t.enabled,
      )

      if (emailTriggers.length === 0) {
        log.info(`No email triggers found for agent ${agentId}`)
        return res.json({
          success: true,
          message: 'Email stored, no triggers to execute',
          emailId: emailData.email.message_id,
        })
      }

      const results = []
      for (const trigger of emailTriggers) {
        try {
          let shouldTrigger = true
          if (trigger.type === 'email') {
            const conditions = (trigger.config as EmailTriggerConfig).conditions || {}
            const fromRules = conditions.from
            const subjectRules = conditions.subject
            if (fromRules?.length && emailData.email.sender) {
              shouldTrigger =
                shouldTrigger &&
                fromRules.some((pattern: string) =>
                  new RegExp(pattern, 'i').test(emailData.email.sender as string),
                )
            }
            if (subjectRules?.length && emailData.email.subject) {
              shouldTrigger =
                shouldTrigger &&
                subjectRules.some((pattern: string) =>
                  new RegExp(pattern, 'i').test(emailData.email.subject as string),
                )
            }
          }

          if (shouldTrigger) {
            log.info(`Executing email trigger ${trigger.id} for agent ${agentId}`)
            const execution = await triggerManager.executeAgentTrigger(trigger, {
              messageId: emailData.email.message_id,
              from: emailData.email.sender,
              subject: emailData.email.subject,
              receivedAt: emailData.email.date,
              emailPath: `.agents/${agentId}/inbox/${emailData.email.message_id}`,
              contentFilePath: `.agents/${agentId}/inbox/${emailData.email.message_id}/content.json`,
              hasAttachments: emailData.attachments && emailData.attachments.length > 0,
              attachmentCount: emailData.attachments ? emailData.attachments.length : 0,
            })

            results.push({
              triggerId: trigger.id,
              executionId: execution.id,
              status: 'executed',
            })
          } else {
            log.info(`Email does not match conditions for trigger ${trigger.id}`)
          }
        } catch (error: any) {
          log.error({ err: error }, `Failed to execute trigger ${trigger.id}:`)
          results.push({
            triggerId: trigger.id,
            status: 'failed',
            error: error.message,
          })
        }
      }

      return res.json({
        success: true,
        agentId,
        emailId: emailData.email.message_id,
        triggersExecuted: results.filter((r) => r.status === 'executed').length,
        results,
      })
    } catch (error: any) {
      log.error({ err: error }, 'Error processing agent email webhook')
      throw error
    }
  }

  async handleAgentEmailStatus(req: Request, res: Response) {
    try {
      const agentId = req.params.agentId!
      const statusData = req.body

      log.info({ data: statusData }, `Received email status webhook for agent ${agentId}:`)

      return res.json({
        success: true,
        agentId,
        status: 'acknowledged',
      })
    } catch (error) {
      log.error({ err: error }, 'Error processing email status webhook')
      throw error
    }
  }
}

export const agentWebhooksController = new AgentWebhooksController()
