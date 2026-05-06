import type { ParsedEmailContent } from '@domains/email/types/email.types'

export interface IS3EmailFetcher {
  /** Fetch and parse email from S3. */
  fetchAndParseEmail(messageId: string, domain?: string): Promise<ParsedEmailContent>
}
