import type { SendEmailOptions, SentEmail } from '@domains/email/types/email.types'

export interface ISESEmailSender {
  /** Send an email via AWS SES. */
  sendEmail(
    agentId: string,
    workspaceId: string,
    userId: string,
    options: SendEmailOptions,
  ): Promise<SentEmail>

  /** Send a reply to an email. */
  sendReply(
    agentId: string,
    workspaceId: string,
    userId: string,
    originalEmail: {
      from: string
      messageId: string
      subject: string
    },
    replyBody: {
      text?: string
      html?: string
    },
    agentEmail?: string,
    threadingHeaders?: {
      inReplyTo?: string
      references?: string[]
    },
  ): Promise<SentEmail>

  /** List sent emails for an agent. */
  listSentEmails(
    agentId: string,
    workspaceId: string,
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<SentEmail[]>
}
