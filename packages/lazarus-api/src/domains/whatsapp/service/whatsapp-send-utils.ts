/**
 * Shared WhatsApp send utilities.
 *
 * Used by both the global agent and workspace agent tools so that
 * chunking logic, media sending, and error handling live in one place.
 */

import type {
  KapsoMediaPayload,
  SendWhatsAppMessageParams,
  SendWhatsAppMessageResult,
} from '@domains/whatsapp/types/whatsapp.types'
import { kapsoService } from './kapso-service'
import logger from '@utils/logger'

const log = logger.child({ module: 'whatsapp-send-utils' })

const MAX_TEXT_LENGTH = 4000 // WhatsApp limit is 4096; keep a buffer

/**
 * Split a long text into WhatsApp-safe chunks on paragraph boundaries.
 */
export function chunkText(text: string, maxLength = MAX_TEXT_LENGTH): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  const paragraphs = text.split('\n\n')
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxLength && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current = current ? current + '\n\n' + para : para
    }
  }
  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

/**
 * Send a WhatsApp message (text and/or media) with automatic chunking.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams,
): Promise<SendWhatsAppMessageResult> {
  const { phoneNumberId, recipientPhone, text, media } = params

  try {
    let messageCount = 0

    // Send media if provided
    if (media && media.type) {
      const mediaPayload: KapsoMediaPayload = {
        type: media.type,
        url: media.url,
        id: media.id,
        caption: media.caption,
        filename: media.filename,
      }
      await kapsoService.sendMediaMessage(phoneNumberId, recipientPhone, mediaPayload)
      messageCount++
    }

    // Send text (chunked if needed)
    if (text) {
      const chunks = chunkText(text)
      for (const chunk of chunks) {
        await kapsoService.sendTextMessage(phoneNumberId, recipientPhone, chunk)
        messageCount++
      }
    }

    if (messageCount === 0) {
      return { success: false, messageCount: 0, error: 'No text or media provided' }
    }

    return { success: true, messageCount }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown send error'
    log.error({ error: errorMsg, recipientPhone }, 'Failed to send WhatsApp message')
    return { success: false, messageCount: 0, error: errorMsg }
  }
}
