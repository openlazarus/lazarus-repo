import type {
  DiscordAttachment,
  ProcessedAttachment,
  SlackFile,
} from '@domains/integration/types/integration.types'

export interface IAttachmentProcessor {
  /** Process a Discord attachment by downloading from CDN and saving to filesystem. */
  processDiscordAttachment(
    attachment: DiscordAttachment,
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment>

  /** Process a Slack file using bot token authentication to download. */
  processSlackFile(
    file: SlackFile,
    botToken: string,
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment>

  /** Process multiple Discord attachments. */
  processDiscordAttachments(
    attachments: DiscordAttachment[],
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment[]>

  /** Process multiple Slack files. */
  processSlackFiles(
    files: SlackFile[],
    botToken: string,
    workspaceId: string,
    agentId?: string,
  ): Promise<ProcessedAttachment[]>

  /** Build a context string describing attachments for agent execution. */
  buildAttachmentContext(attachments: ProcessedAttachment[]): string

  /** Get the files API endpoint path for accessing an attachment. */
  getFileApiUrl(workspaceId: string, storagePath: string): string

  /** Convert attachment metadata to storage format. */
  toStorageFormat(attachments: ProcessedAttachment[]): Array<{
    filename: string
    url: string
    contentType: string
    size: number
    storagePath?: string
  }>

  /** Check if content type is an image. */
  isImage(contentType: string): boolean

  /** Check if content type is a video. */
  isVideo(contentType: string): boolean

  /** Check if content type is audio. */
  isAudio(contentType: string): boolean
}
