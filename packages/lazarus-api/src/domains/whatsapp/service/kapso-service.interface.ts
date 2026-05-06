import type {
  KapsoCustomer,
  KapsoMediaPayload,
  KapsoMessageResponse,
  KapsoPhoneNumber,
  KapsoSetupLink,
  KapsoWebhookEvent,
} from '@domains/whatsapp/types/whatsapp.types'

export interface IKapsoService {
  /** Send a text message via WhatsApp. */
  sendTextMessage(phoneNumberId: string, to: string, text: string): Promise<KapsoMessageResponse>

  /** Send a media message via WhatsApp. */
  sendMediaMessage(
    phoneNumberId: string,
    to: string,
    media: KapsoMediaPayload,
  ): Promise<KapsoMessageResponse>

  /** Send a template message via WhatsApp. */
  sendTemplateMessage(
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode?: string,
    components?: any[],
  ): Promise<KapsoMessageResponse>

  /** Send an interactive button message via WhatsApp. */
  sendInteractiveMessage(
    phoneNumberId: string,
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string,
  ): Promise<KapsoMessageResponse>

  /** Mark a message as read. */
  markMessageAsRead(phoneNumberId: string, messageId: string): Promise<{ success: boolean }>

  /** Download media from Kapso. */
  downloadMedia(mediaId: string, phoneNumberId: string): Promise<Buffer>

  /** Upload media to Kapso. */
  uploadMedia(
    phoneNumberId: string,
    file: Buffer,
    mimeType: string,
    filename?: string,
  ): Promise<{ id: string }>

  /** Create a setup link for user to connect their WhatsApp Business number. */
  createSetupLink(
    customerId: string,
    options?: { provisionPhoneNumber?: boolean; redirectUrl?: string; expiresIn?: number },
  ): Promise<KapsoSetupLink>

  /** Get or create a Kapso customer for a workspace. */
  getOrCreateCustomer(
    workspaceId: string,
    workspaceName?: string,
    metadata?: Record<string, any>,
  ): Promise<KapsoCustomer>

  /** List phone numbers for a customer. */
  listPhoneNumbers(customerId: string): Promise<KapsoPhoneNumber[]>

  /** Get phone number details from Meta/WhatsApp API via Kapso. */
  getPhoneNumber(phoneNumberId: string): Promise<KapsoPhoneNumber>

  /** List message templates for a WhatsApp Business Account. */
  listMessageTemplates(
    businessAccountId: string,
  ): Promise<
    Array<{ name: string; status: string; language: string; category: string; components: any[] }>
  >

  /** Delete a phone number from the Kapso account. */
  disconnectPhoneNumber(phoneNumberId: string): Promise<void>

  /** Configure webhook for a phone number. */
  configurePhoneWebhook(
    phoneNumberId: string,
    webhookUrl: string,
    secretKey: string,
    events?: string[],
  ): Promise<{ id: string; url: string }>

  /** List webhooks configured for a phone number. */
  listPhoneWebhooks(
    phoneNumberId: string,
  ): Promise<Array<{ id: string; url: string; events: string[] }>>

  /** Delete a webhook from a phone number. */
  deletePhoneWebhook(phoneNumberId: string, webhookId: string): Promise<void>

  /** Verify webhook signature from Kapso. */
  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean

  /** Parse webhook event from Kapso. */
  parseWebhookEvent(payload: any): KapsoWebhookEvent

  /** Extract messages from webhook event. */
  extractMessagesFromWebhook(
    event: KapsoWebhookEvent,
  ): Array<{
    phoneNumberId: string
    displayPhoneNumber: string
    message: any
    contact?: { name: string; wa_id: string }
  }>

  /** Extract status updates from webhook event. */
  extractStatusesFromWebhook(
    event: KapsoWebhookEvent,
  ): Array<{ phoneNumberId: string; status: any }>

  /** Normalize phone number to E.164 format. */
  normalizePhoneNumber(phone: string): string

  /** Validate phone number format. */
  isValidPhoneNumber(phone: string): boolean

  /** Check if Kapso API is configured. */
  isConfigured(): boolean
}
