export interface ParsedEmailContent {
  textContent?: string
  htmlContent?: string
  subject: string
  from: string
  to: string[]
  date: Date
  messageId: string
  inReplyTo?: string
  references?: string[]
  emailMessageId?: string
  attachments: Array<{
    filename: string
    contentType: string
    size: number
    content: Buffer
  }>
}

export interface EmailAttachment {
  path: string
  filename?: string
}

export interface SendEmailOptions {
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: {
    text?: string
    html?: string
  }
  replyTo?: string
  inReplyTo?: string
  references?: string[]
  attachments?: EmailAttachment[]
  workspacePath?: string
}

export interface SentEmail {
  messageId: string
  from: string
  to: string[]
  subject: string
  sentAt: string
  sesMessageId?: string
}

/**
 * Context provided to each attachment destination when saving.
 */
export type AttachmentContext = {
  workspaceId: string
  agentId: string
  messageId: string
  filename: string
  safeFilename: string
  contentType: string
  size: number
  /** Resolved workspace root path on disk */
  workspacePath: string
  /** Source platform — used to organize files by origin */
  platform: 'email' | 'whatsapp' | 'discord' | 'slack'
}

/**
 * Strategy interface for attachment storage destinations.
 *
 * Each destination receives the decoded file buffer and context,
 * and persists the attachment in its own way.  Destinations are
 * independent — a failure in one does not block the others.
 */
export interface IAttachmentDestination {
  /** Human-readable name used in log messages. */
  readonly name: string

  /** Persist the attachment. Throw on failure. */
  save(ctx: AttachmentContext, buffer: Buffer): Promise<void>
}
