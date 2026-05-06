import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
  SendRawEmailCommand,
} from '@aws-sdk/client-ses'
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { EmailAttachment, SendEmailOptions, SentEmail } from '@domains/email/types/email.types'
import type { ISESEmailSender } from './ses-email-sender.interface'
import { getContentType } from '@utils/mime-types'
import { readWorkspaceFile, PLATFORM_SIZE_LIMITS } from '@utils/workspace-file-reader'
import { createLogger } from '@utils/logger'
const log = createLogger('ses-email-sender')

/** Context available to each header rule for condition checking and emission. */
type MimeHeaderContext = {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  replyTo?: string
  inReplyTo?: string
  references?: string[]
  boundary: string
}

/** Options object for buildMimeMessage — replaces positional params. */
type MimeMessageOptions = {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  textBody?: string
  htmlBody?: string
  replyTo?: string
  inReplyTo?: string
  references?: string[]
  attachments: { filename: string; contentType: string; content: Buffer }[]
}

/**
 * Service for sending emails via AWS SES
 */
export class SESEmailSender implements ISESEmailSender {
  private sesClient: SESClient
  private baseStoragePath: string
  private defaultFromDomain: string

  constructor(region?: string, baseStoragePath?: string) {
    this.sesClient = SESEmailSender.buildClient(region)
    this.baseStoragePath = baseStoragePath || process.env.STORAGE_BASE_PATH || './storage'
    this.defaultFromDomain = process.env.EMAIL_DOMAIN || 'your-domain.example'
  }

  private static buildClient(explicitRegion?: string): SESClient {
    const region = explicitRegion || process.env.AWS_REGION || 'us-east-1'
    const roleArn = process.env.AWS_ROLE_ARN
    if (roleArn) {
      return new SESClient({
        region,
        credentials: fromTemporaryCredentials({
          params: { RoleArn: roleArn, RoleSessionName: 'lazarus-api' },
        }),
      })
    }
    return new SESClient({ region })
  }

  /**
   * Validate and read attachment file.
   * Delegates to the shared readWorkspaceFile utility for path validation,
   * size enforcement and MIME detection.
   */
  private async readAttachment(
    workspacePath: string,
    attachment: EmailAttachment,
  ): Promise<{ filename: string; contentType: string; content: Buffer; size: number }> {
    const file = await readWorkspaceFile(workspacePath, attachment.path, {
      maxSize: PLATFORM_SIZE_LIMITS.email,
    })

    // Allow caller-specified filename override
    const filename = attachment.filename || file.filename
    const contentType = attachment.filename ? getContentType(attachment.filename) : file.contentType

    return { filename, contentType, content: file.content, size: file.size }
  }

  // -----------------------------------------------------------------------
  // MIME header strategy — each entry knows when it applies and what to emit
  // -----------------------------------------------------------------------

  /** A single MIME-header rule: check a condition, emit header line(s). */
  private static readonly HEADER_RULES: Array<{
    shouldApply: (opts: MimeHeaderContext) => boolean
    apply: (opts: MimeHeaderContext) => string[]
  }> = [
    {
      shouldApply: () => true,
      apply: (ctx) => [`From: ${ctx.from}`, `To: ${ctx.to.join(', ')}`],
    },
    {
      shouldApply: (ctx) => (ctx.cc?.length ?? 0) > 0,
      apply: (ctx) => [`Cc: ${ctx.cc!.join(', ')}`],
    },
    {
      shouldApply: (ctx) => (ctx.bcc?.length ?? 0) > 0,
      apply: (ctx) => [`Bcc: ${ctx.bcc!.join(', ')}`],
    },
    {
      shouldApply: (ctx) => !!ctx.replyTo,
      apply: (ctx) => [`Reply-To: ${ctx.replyTo}`],
    },
    {
      shouldApply: (ctx) => !!ctx.inReplyTo,
      apply: (ctx) => {
        const val = ctx.inReplyTo!
        return [`In-Reply-To: ${val.includes('<') ? val : `<${val}>`}`]
      },
    },
    {
      shouldApply: (ctx) => (ctx.references?.length ?? 0) > 0,
      apply: (ctx) => {
        const refs = ctx.references!.map((r) => (r.includes('<') ? r : `<${r}>`)).join(' ')
        return [`References: ${refs}`]
      },
    },
    {
      shouldApply: () => true,
      apply: (ctx) => [`Subject: ${ctx.subject}`, 'MIME-Version: 1.0'],
    },
  ]

  /**
   * Build MIME message with optional threading headers and attachments.
   */
  private buildMimeMessage(opts: MimeMessageOptions): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const lines: string[] = []

    // Apply header rules
    const headerCtx: MimeHeaderContext = { ...opts, boundary }
    for (const rule of SESEmailSender.HEADER_RULES) {
      if (rule.shouldApply(headerCtx)) {
        lines.push(...rule.apply(headerCtx))
      }
    }

    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
    lines.push('')

    // Text body part
    if (opts.textBody) {
      lines.push(`--${boundary}`)
      lines.push('Content-Type: text/plain; charset=UTF-8')
      lines.push('Content-Transfer-Encoding: 7bit')
      lines.push('')
      lines.push(opts.textBody)
      lines.push('')
    }

    // HTML body part
    if (opts.htmlBody) {
      lines.push(`--${boundary}`)
      lines.push('Content-Type: text/html; charset=UTF-8')
      lines.push('Content-Transfer-Encoding: 7bit')
      lines.push('')
      lines.push(opts.htmlBody)
      lines.push('')
    }

    // Attachment parts
    for (const attachment of opts.attachments) {
      lines.push(`--${boundary}`)
      lines.push(`Content-Type: ${attachment.contentType}; name="${attachment.filename}"`)
      lines.push('Content-Transfer-Encoding: base64')
      lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`)
      lines.push('')
      const base64 = attachment.content.toString('base64')
      for (let i = 0; i < base64.length; i += 76) {
        lines.push(base64.substring(i, i + 76))
      }
      lines.push('')
    }

    lines.push(`--${boundary}--`)
    lines.push('')

    return lines.join('\r\n')
  }

  /**
   * Get the sent emails directory path for an agent
   */
  private getSentPath(userId: string, workspaceId: string, agentId: string): string {
    return path.join(
      this.baseStoragePath,
      'users',
      userId,
      'workspaces',
      workspaceId,
      '.agents',
      agentId,
      'sent',
    )
  }

  /**
   * Ensure sent directory exists
   */
  private async ensureSentDirExists(
    userId: string,
    workspaceId: string,
    agentId: string,
  ): Promise<void> {
    const sentPath = this.getSentPath(userId, workspaceId, agentId)
    await fs.mkdir(sentPath, { recursive: true })
  }

  /**
   * Save sent email to agent's sent folder
   */
  private async saveSentEmail(
    userId: string,
    workspaceId: string,
    agentId: string,
    sentEmail: SentEmail,
  ): Promise<void> {
    await this.ensureSentDirExists(userId, workspaceId, agentId)

    const sentPath = this.getSentPath(userId, workspaceId, agentId)
    const filename = `${sentEmail.messageId}.json`
    const filePath = path.join(sentPath, filename)

    await fs.writeFile(filePath, JSON.stringify(sentEmail, null, 2), 'utf-8')

    log.info(`Saved sent email ${sentEmail.messageId} for agent ${agentId}`)
  }

  /**
   * Send an email via AWS SES
   */
  async sendEmail(
    agentId: string,
    workspaceId: string,
    userId: string,
    options: SendEmailOptions,
  ): Promise<SentEmail> {
    try {
      // Validate email options
      if (!options.to || options.to.length === 0) {
        throw new Error('At least one recipient is required')
      }

      if (!options.subject || options.subject.trim() === '') {
        throw new Error('Subject is required')
      }

      if (!options.body.text && !options.body.html) {
        throw new Error('Email body (text or html) is required')
      }

      let response: { MessageId?: string }

      // Check if email has attachments
      if (options.attachments && options.attachments.length > 0) {
        // Validate workspace path is provided
        if (!options.workspacePath) {
          throw new Error('Workspace path is required when sending attachments')
        }

        // Read and validate all attachments
        const attachmentData = await Promise.all(
          options.attachments.map((att) => this.readAttachment(options.workspacePath!, att)),
        )

        // Check total email size (AWS SES limit: 10MB for raw email)
        const totalSize = attachmentData.reduce((sum, att) => sum + att.size, 0)
        const textSize = (options.body.text?.length || 0) + (options.body.html?.length || 0)
        const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10MB
        if (totalSize + textSize > MAX_TOTAL_SIZE) {
          throw new Error(
            `Total email size too large: ${((totalSize + textSize) / 1024 / 1024).toFixed(2)}MB > 10MB`,
          )
        }

        log.info(
          {
            attachmentCount: attachmentData.length,
            attachments: attachmentData.map((a) => ({
              filename: a.filename,
              size: a.size,
              contentType: a.contentType,
            })),
            totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
          },
          'Sending email with attachments',
        )

        // Build MIME message
        const mimeMessage = this.buildMimeMessage({
          from: options.from,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          textBody: options.body.text,
          htmlBody: options.body.html,
          replyTo: options.replyTo,
          inReplyTo: options.inReplyTo,
          references: options.references,
          attachments: attachmentData,
        })

        // Send raw email via SES
        const rawEmailCommand = new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(mimeMessage),
          },
        })

        response = await this.sesClient.send(rawEmailCommand)
      } else if (options.inReplyTo || (options.references && options.references.length > 0)) {
        // Threading headers require raw email (SendEmailCommand doesn't support custom headers)
        const mimeMessage = this.buildMimeMessage({
          from: options.from,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          textBody: options.body.text,
          htmlBody: options.body.html,
          replyTo: options.replyTo,
          inReplyTo: options.inReplyTo,
          references: options.references,
          attachments: [],
        })

        const rawEmailCommand = new SendRawEmailCommand({
          RawMessage: { Data: Buffer.from(mimeMessage) },
        })

        response = await this.sesClient.send(rawEmailCommand)
      } else {
        // Send simple email without attachments (original implementation)
        const emailParams: SendEmailCommandInput = {
          Source: options.from,
          Destination: {
            ToAddresses: options.to,
            CcAddresses: options.cc,
            BccAddresses: options.bcc,
          },
          Message: {
            Subject: {
              Data: options.subject,
              Charset: 'UTF-8',
            },
            Body: {
              ...(options.body.text && {
                Text: {
                  Data: options.body.text,
                  Charset: 'UTF-8',
                },
              }),
              ...(options.body.html && {
                Html: {
                  Data: options.body.html,
                  Charset: 'UTF-8',
                },
              }),
            },
          },
          ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        }

        // Send email via SES
        const command = new SendEmailCommand(emailParams)
        response = await this.sesClient.send(command)
      }

      log.info(
        {
          agentId,
          from: options.from,
          to: options.to,
          subject: options.subject,
          hasAttachments: (options.attachments?.length || 0) > 0,
          attachmentCount: options.attachments?.length || 0,
          sesMessageId: response.MessageId,
        },
        'Email sent successfully',
      )

      // Create sent email record
      const sentEmail: SentEmail = {
        messageId: `sent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        from: options.from,
        to: options.to,
        subject: options.subject,
        sentAt: new Date().toISOString(),
        sesMessageId: response.MessageId,
      }

      // Save to agent's sent folder
      await this.saveSentEmail(userId, workspaceId, agentId, sentEmail)

      return sentEmail
    } catch (error: any) {
      log.error({ err: error }, 'Failed to send email')
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  /**
   * Send a reply to an email
   * Automatically sets the reply-to and uses the correct from address
   */
  async sendReply(
    agentId: string,
    workspaceId: string,
    userId: string,
    originalEmail: {
      from: string // Original sender (becomes "to" in reply)
      messageId: string // Original message ID
      subject: string // Original subject
    },
    replyBody: {
      text?: string
      html?: string
    },
    agentEmail?: string, // Optional: agent's email address (if not provided, uses default)
    threadingHeaders?: {
      inReplyTo?: string
      references?: string[]
    },
  ): Promise<SentEmail> {
    // Use provided agent email or construct from default domain
    const fromEmail = agentEmail || `${agentId}@${this.defaultFromDomain}`

    // Add "Re: " prefix to subject if not already present
    const replySubject = originalEmail.subject.startsWith('Re: ')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`

    return this.sendEmail(agentId, workspaceId, userId, {
      from: fromEmail,
      to: [originalEmail.from],
      subject: replySubject,
      body: replyBody,
      replyTo: fromEmail,
      inReplyTo: threadingHeaders?.inReplyTo,
      references: threadingHeaders?.references,
    })
  }

  /**
   * List sent emails for an agent
   */
  async listSentEmails(
    agentId: string,
    workspaceId: string,
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<SentEmail[]> {
    try {
      const sentPath = this.getSentPath(userId, workspaceId, agentId)

      // Check if sent directory exists
      try {
        await fs.access(sentPath)
      } catch (error) {
        // Directory doesn't exist yet, return empty array
        return []
      }

      // Read all JSON files in sent directory
      const files = await fs.readdir(sentPath)
      const emailFiles = files.filter((f) => f.endsWith('.json'))

      const sentEmails: SentEmail[] = []

      for (const file of emailFiles) {
        try {
          const content = await fs.readFile(path.join(sentPath, file), 'utf-8')
          const email: SentEmail = JSON.parse(content)
          sentEmails.push(email)
        } catch (error) {
          log.error({ err: error }, `Failed to read sent email file ${file}:`)
          // Skip invalid files
        }
      }

      // Sort by date (newest first)
      sentEmails.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

      // Apply pagination
      return sentEmails.slice(offset, offset + limit)
    } catch (error) {
      log.error({ err: error }, `Failed to list sent emails:`)
      throw new Error(`Failed to list sent emails for agent ${agentId}: ${error}`)
    }
  }
}

// Export singleton instance
export const sesEmailSender: ISESEmailSender = new SESEmailSender()
