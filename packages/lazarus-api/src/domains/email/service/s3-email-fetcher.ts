import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { simpleParser, ParsedMail } from 'mailparser'
import { Readable } from 'stream'
import type { ParsedEmailContent } from '@domains/email/types/email.types'
import type { IS3EmailFetcher } from './s3-email-fetcher.interface'
import { createLogger } from '@utils/logger'

const log = createLogger('s3-email-fetcher')

/**
 * Service for fetching and parsing emails from S3
 */
export class S3EmailFetcher implements IS3EmailFetcher {
  private s3Client: S3Client
  private bucketName: string

  constructor(region = 'us-east-1', bucketName = 'lazarus-email-service-bucket') {
    this.s3Client = new S3Client({ region })
    this.bucketName = bucketName
  }

  /**
   * Fetch and parse email from S3
   */
  async fetchAndParseEmail(
    messageId: string,
    domain = process.env.EMAIL_DOMAIN || 'your-domain.example',
  ): Promise<ParsedEmailContent> {
    try {
      // Construct S3 key
      const key = `emails/${domain}/${messageId}`

      log.info({ bucket: this.bucketName, key }, 'Fetching email from S3')

      // Fetch email from S3
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)

      if (!response.Body) {
        throw new Error('Email body is empty')
      }

      // Convert stream to buffer
      const emailBuffer = await this.streamToBuffer(response.Body as Readable)

      // Parse email
      const parsed = await simpleParser(emailBuffer)

      log.info(
        {
          messageId,
          subject: parsed.subject,
          from: parsed.from?.text,
          textLength: parsed.text?.length || 0,
          htmlLength: parsed.html ? (typeof parsed.html === 'string' ? parsed.html.length : 0) : 0,
          attachmentCount: parsed.attachments?.length || 0,
        },
        'Email parsed successfully',
      )

      return this.convertParsedMail(parsed, messageId)
    } catch (error: any) {
      log.error({ err: error, messageId }, 'Failed to fetch/parse email')
      throw new Error(`Failed to fetch email from S3: ${error.message}`)
    }
  }

  /**
   * Convert mailparser output to our format
   */
  private convertParsedMail(parsed: ParsedMail, messageId: string): ParsedEmailContent {
    // Parse References header — can be a string (space-separated) or array
    let references: string[] | undefined
    if (parsed.references) {
      references = Array.isArray(parsed.references)
        ? parsed.references
        : parsed.references.split(/\s+/).filter(Boolean)
    }

    return {
      textContent: parsed.text || undefined,
      htmlContent:
        typeof parsed.html === 'string' ? parsed.html : parsed.html?.toString() || undefined,
      subject: parsed.subject || '',
      from: parsed.from?.text || parsed.from?.value?.[0]?.address || '',
      to: (Array.isArray(parsed.to) ? parsed.to : parsed.to ? [parsed.to] : []).flatMap((obj) =>
        obj.value.map((addr: { address?: string }) => addr.address || ''),
      ),
      date: parsed.date || new Date(),
      messageId: parsed.messageId || messageId,
      inReplyTo: parsed.inReplyTo,
      references,
      emailMessageId: parsed.messageId,
      attachments: (parsed.attachments || []).map((att) => ({
        filename: att.filename || 'unnamed',
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0,
        content: att.content,
      })),
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }
}

// Export singleton instance
export const s3EmailFetcher: IS3EmailFetcher = new S3EmailFetcher()
