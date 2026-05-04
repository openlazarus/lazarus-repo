import * as crypto from 'crypto'
import { KapsoApiError } from '@errors/api-errors'
import type {
  KapsoCustomer,
  KapsoMediaPayload,
  KapsoMessageResponse,
  KapsoPhoneNumber,
  KapsoSetupLink,
  KapsoWebhookEvent,
  MetaNameStatus,
} from '@domains/whatsapp/types/whatsapp.types'
import type { IKapsoService } from './kapso-service.interface'
import { createLogger } from '@utils/logger'

const log = createLogger('kapso-service')

/**
 * Kapso.ai WhatsApp API Service
 *
 * Handles all interactions with the Kapso.ai API for WhatsApp messaging.
 * Reference: https://kapso.ai/docs
 */

export class KapsoService implements IKapsoService {
  private apiKey: string
  private baseUrl: string
  private webhookSecret: string

  constructor() {
    this.apiKey = process.env.KAPSO_API_KEY || ''
    this.baseUrl = process.env.KAPSO_BASE_URL || 'https://api.kapso.ai'
    this.webhookSecret = process.env.KAPSO_WEBHOOK_SECRET || ''

    if (!this.apiKey) {
      log.warn('KAPSO_API_KEY not set - WhatsApp features will be unavailable')
    }
  }

  /**
   * Make an authenticated request to Kapso API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      log.error(
        { status: response.status, statusText: response.statusText, errorBody },
        'API error',
      )
      throw new KapsoApiError(response.status, response.statusText, errorBody)
    }

    return response.json() as Promise<T>
  }

  // ===========================
  // Messaging Methods
  // ===========================

  /**
   * Send a text message via WhatsApp
   */
  async sendTextMessage(
    phoneNumberId: string,
    to: string,
    text: string,
  ): Promise<KapsoMessageResponse> {
    const normalizedTo = this.normalizePhoneNumber(to)

    return this.request<KapsoMessageResponse>(`/meta/whatsapp/v24.0/${phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: { body: text },
      }),
    })
  }

  /**
   * Send a media message via WhatsApp
   */
  async sendMediaMessage(
    phoneNumberId: string,
    to: string,
    media: KapsoMediaPayload,
  ): Promise<KapsoMessageResponse> {
    const normalizedTo = this.normalizePhoneNumber(to)

    const messagePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: media.type,
    }

    // Build media-specific payload
    const mediaBody: any = {
      ...(media.url && { link: media.url }),
      ...(media.id && { id: media.id }),
      ...(media.caption && { caption: media.caption }),
      ...(media.filename && { filename: media.filename }),
    }

    messagePayload[media.type] = mediaBody

    return this.request<KapsoMessageResponse>(`/meta/whatsapp/v24.0/${phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messagePayload),
    })
  }

  /**
   * Send a template message via WhatsApp
   */
  async sendTemplateMessage(
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[],
  ): Promise<KapsoMessageResponse> {
    const normalizedTo = this.normalizePhoneNumber(to)

    return this.request<KapsoMessageResponse>(`/meta/whatsapp/v24.0/${phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    })
  }

  /**
   * Send an interactive button message via WhatsApp.
   *
   * The Meta WhatsApp Business API supports up to 3 quick-reply buttons.
   * Used for permission requests, confirmations, etc.
   */
  async sendInteractiveMessage(
    phoneNumberId: string,
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string,
  ): Promise<KapsoMessageResponse> {
    const normalizedTo = this.normalizePhoneNumber(to)

    const interactive: any = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.substring(0, 20) }, // WhatsApp limits button title to 20 chars
        })),
      },
    }

    if (header) {
      interactive.header = { type: 'text', text: header }
    }
    if (footer) {
      interactive.footer = { text: footer.substring(0, 60) } // WhatsApp limits footer to 60 chars
    }

    return this.request<KapsoMessageResponse>(`/meta/whatsapp/v24.0/${phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'interactive',
        interactive,
      }),
    })
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(phoneNumberId: string, messageId: string): Promise<{ success: boolean }> {
    return this.request(`/meta/whatsapp/v24.0/${phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  }

  // ===========================
  // Media Methods
  // ===========================

  /**
   * Download media from Kapso
   */
  async downloadMedia(mediaId: string, phoneNumberId: string): Promise<Buffer> {
    // Download via Kapso-hosted media URL (from messages API with kapso(media_url) extension).
    // The standard Meta CDN URL requires a Meta access token we don't have,
    // but Kapso stores a copy accessible via their Rails active_storage URLs.
    // There's a race condition: the media_url may not be available immediately after
    // the webhook fires, so we retry with a delay.
    const maxRetries = 3
    const retryDelayMs = 2000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (attempt > 1) {
        log.info({ attempt, maxRetries, retryDelayMs }, 'downloadMedia - retrying')
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      }

      const messagesResponse = await this.request<{ data: any[] }>(
        `/meta/whatsapp/v24.0/${phoneNumberId}/messages?fields=kapso(media_url)&limit=20`,
      )

      for (const msg of messagesResponse.data) {
        const mediaData = msg[msg.type]
        if (mediaData?.id === mediaId) {
          const kapsoMediaUrl = msg.kapso?.media_url || mediaData?.link
          if (kapsoMediaUrl) {
            log.info({ attempt }, 'downloadMedia - found media_url')
            const response = await fetch(kapsoMediaUrl, { redirect: 'follow' })
            if (!response.ok) {
              const errorBody = await response.text().catch(() => '')
              log.error(
                { status: response.status, url: kapsoMediaUrl, body: errorBody },
                'downloadMedia failed',
              )
              throw new Error(`Failed to download media: ${response.status}`)
            }
            const arrayBuffer = await response.arrayBuffer()
            log.info({ bytes: arrayBuffer.byteLength }, 'downloadMedia success')
            return Buffer.from(arrayBuffer)
          }
          // Found the message but media_url not ready yet
          log.info({ attempt }, 'downloadMedia - message found but media_url not ready')
          break
        }
      }
    }

    throw new Error(
      `Failed to download media: Kapso media_url not available after ${maxRetries} retries`,
    )
  }

  /**
   * Upload media to Kapso
   */
  async uploadMedia(
    phoneNumberId: string,
    file: Buffer,
    mimeType: string,
    filename?: string,
  ): Promise<{ id: string }> {
    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')
    formData.append('file', new Blob([file], { type: mimeType }), filename || 'file')
    formData.append('type', mimeType)

    const response = await fetch(`${this.baseUrl}/meta/whatsapp/v24.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload media: ${response.status}`)
    }

    return response.json() as Promise<{ id: string }>
  }

  // ===========================
  // Phone Number Management
  // ===========================

  /**
   * Create a setup link for user to connect their WhatsApp Business number
   */
  async createSetupLink(
    customerId: string,
    options: {
      provisionPhoneNumber?: boolean
      redirectUrl?: string
      expiresIn?: number // seconds
    } = {},
  ): Promise<KapsoSetupLink> {
    log.info({ customerId, redirectUrl: options.redirectUrl }, 'Creating setup link')

    const response = await this.request<{ data: KapsoSetupLink }>(
      `/platform/v1/customers/${customerId}/setup_links`,
      {
        method: 'POST',
        body: JSON.stringify({
          setup_link: {
            provision_phone_number: options.provisionPhoneNumber || false,
            success_redirect_url: options.redirectUrl,
            failure_redirect_url: options.redirectUrl,
            expires_in: options.expiresIn || 3600, // 1 hour default
          },
        }),
      },
    )

    log.info({ url: response.data.url }, 'Setup link created')
    return response.data
  }

  /**
   * Get or create a Kapso customer for a workspace
   */
  async getOrCreateCustomer(
    workspaceId: string,
    workspaceName?: string,
    metadata?: Record<string, any>,
  ): Promise<KapsoCustomer> {
    // Try to get existing customer
    try {
      const customers = await this.request<{ data: KapsoCustomer[] }>(
        `/platform/v1/customers?external_customer_id=${workspaceId}`,
      )

      if (customers.data.length > 0) {
        return customers.data[0]!
      }
    } catch (error) {
      log.debug({ err: error }, "Customer doesn't exist, create one")
    }

    // Create new customer (Kapso requires name and uses external_customer_id)
    const response = await this.request<{ data: KapsoCustomer }>(`/platform/v1/customers`, {
      method: 'POST',
      body: JSON.stringify({
        customer: {
          external_customer_id: workspaceId,
          name: workspaceName || workspaceId,
          ...metadata,
        },
      }),
    })
    return response.data
  }

  /**
   * List phone numbers for a customer
   */
  async listPhoneNumbers(customerId: string): Promise<KapsoPhoneNumber[]> {
    const response = await this.request<{ data: KapsoPhoneNumber[] }>(
      `/platform/v1/customers/${customerId}/phone_numbers`,
    )
    return response.data
  }

  /**
   * Get phone number details from Meta/WhatsApp API via Kapso
   */
  async getPhoneNumber(phoneNumberId: string): Promise<KapsoPhoneNumber> {
    // Use the Meta WhatsApp API endpoint via Kapso with extended fields
    const fields =
      'verified_name,name_status,quality_rating,display_phone_number,status,account_mode,is_official_business_account,messaging_limit_tier'
    const response = await this.request<{
      id: string
      verified_name?: string
      name_status?: string
      display_phone_number: string
      quality_rating?: string
      status?: string
      account_mode?: string
      is_official_business_account?: boolean
      messaging_limit_tier?: string
    }>(`/meta/whatsapp/v24.0/${phoneNumberId}?fields=${fields}`)

    return {
      id: response.id,
      phoneNumber: response.display_phone_number,
      phoneNumberId: response.id,
      displayName: response.verified_name,
      qualityRating: response.quality_rating,
      status: 'connected',
      verifiedName: response.verified_name,
      nameStatus: (response.name_status as MetaNameStatus) || 'NONE',
      accountMode: response.account_mode,
      isOfficialBusinessAccount: response.is_official_business_account,
      messagingLimitTier: response.messaging_limit_tier,
    }
  }

  /**
   * List message templates for a WhatsApp Business Account
   */
  async listMessageTemplates(businessAccountId: string): Promise<
    Array<{
      name: string
      status: string
      language: string
      category: string
      components: any[]
    }>
  > {
    try {
      const response = await this.request<{
        data: Array<{
          name: string
          status: string
          language: string
          category: string
          components: any[]
        }>
      }>(`/meta/whatsapp/v24.0/${businessAccountId}/message_templates`)

      return response.data || []
    } catch (error) {
      log.warn(
        { err: error },
        'Failed to list message templates - Kapso may not proxy this endpoint',
      )
      return []
    }
  }

  /**
   * Delete a phone number from the Kapso account
   */
  async disconnectPhoneNumber(phoneNumberId: string): Promise<void> {
    await this.request(`/platform/v1/whatsapp/phone_numbers/${phoneNumberId}`, { method: 'DELETE' })
  }

  // ===========================
  // Webhook Methods
  // ===========================

  /**
   * Configure webhook for a phone number to receive messages
   * This must be called after a phone number is connected to start receiving messages
   */
  async configurePhoneWebhook(
    phoneNumberId: string,
    webhookUrl: string,
    secretKey: string,
    _events: string[] = [
      'whatsapp.message.received',
      'whatsapp.message.sent',
      'whatsapp.message.delivered',
      'whatsapp.message.read',
      'whatsapp.message.failed',
      'whatsapp.conversation.created',
      'whatsapp.conversation.ended',
      'whatsapp.account.quality_changed',
      'whatsapp.account.status_changed',
    ],
  ): Promise<{ id: string; url: string }> {
    log.info({ phoneNumberId, webhookUrl }, 'Configuring webhook for phone')

    const response = await this.request<{ data: { id: string; url: string } }>(
      `/platform/v1/whatsapp/phone_numbers/${phoneNumberId}/webhooks`,
      {
        method: 'POST',
        body: JSON.stringify({
          whatsapp_webhook: {
            kind: 'meta',
            url: webhookUrl,
            secret_key: secretKey,
            active: true,
          },
        }),
      },
    )

    log.info({ webhookId: response.data.id }, 'Webhook configured successfully')
    return response.data
  }

  /**
   * List webhooks configured for a phone number
   */
  async listPhoneWebhooks(
    phoneNumberId: string,
  ): Promise<Array<{ id: string; url: string; events: string[] }>> {
    const response = await this.request<{
      data: Array<{ id: string; url: string; events: string[] }>
    }>(`/platform/v1/whatsapp/phone_numbers/${phoneNumberId}/webhooks`)
    return response.data
  }

  /**
   * Delete a webhook from a phone number
   */
  async deletePhoneWebhook(phoneNumberId: string, webhookId: string): Promise<void> {
    await this.request(
      `/platform/v1/whatsapp/phone_numbers/${phoneNumberId}/webhooks/${webhookId}`,
      { method: 'DELETE' },
    )
  }

  /**
   * Verify webhook signature from Kapso
   */
  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    const webhookSecret = secret || this.webhookSecret

    if (!webhookSecret) {
      log.warn('No webhook secret configured - skipping signature verification')
      return true // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex')

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    } catch (error) {
      log.error({ err: error }, 'Signature verification error')
      return false
    }
  }

  /**
   * Parse webhook event from Kapso
   */
  parseWebhookEvent(payload: any): KapsoWebhookEvent {
    return payload as KapsoWebhookEvent
  }

  /**
   * Extract messages from webhook event
   */
  extractMessagesFromWebhook(event: KapsoWebhookEvent): Array<{
    phoneNumberId: string
    displayPhoneNumber: string
    message: any
    contact?: { name: string; wa_id: string }
  }> {
    const messages: Array<{
      phoneNumberId: string
      displayPhoneNumber: string
      message: any
      contact?: { name: string; wa_id: string }
    }> = []

    for (const entry of event.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages' && change.value.messages) {
          const metadata = change.value.metadata
          const contacts = change.value.contacts || []

          for (const message of change.value.messages) {
            const contact = contacts.find((c) => c.wa_id === message.from)
            messages.push({
              phoneNumberId: metadata.phone_number_id,
              displayPhoneNumber: metadata.display_phone_number,
              message,
              contact: contact ? { name: contact.profile.name, wa_id: contact.wa_id } : undefined,
            })
          }
        }
      }
    }

    return messages
  }

  /**
   * Extract status updates from webhook event
   */
  extractStatusesFromWebhook(event: KapsoWebhookEvent): Array<{
    phoneNumberId: string
    status: any
  }> {
    const statuses: Array<{
      phoneNumberId: string
      status: any
    }> = []

    for (const entry of event.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages' && change.value.statuses) {
          const metadata = change.value.metadata

          for (const status of change.value.statuses) {
            statuses.push({
              phoneNumberId: metadata.phone_number_id,
              status,
            })
          }
        }
      }
    }

    return statuses
  }

  // ===========================
  // Utility Methods
  // ===========================

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '')

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      // Assume US number if no country code
      if (normalized.length === 10) {
        normalized = '+1' + normalized
      } else {
        normalized = '+' + normalized
      }
    }

    return normalized
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    const normalized = this.normalizePhoneNumber(phone)
    // Basic E.164 validation: + followed by 7-15 digits
    return /^\+[1-9]\d{6,14}$/.test(normalized)
  }

  /**
   * Check if Kapso API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }
}

// Export singleton instance
export const kapsoService: IKapsoService = new KapsoService()
