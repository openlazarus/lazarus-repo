/** Meta display-name status from WhatsApp / Kapso APIs (unified union for status maps and phone models). */
export type MetaNameStatus =
  | 'APPROVED'
  | 'AVAILABLE_WITHOUT_REVIEW'
  | 'NON_EXISTS'
  | 'DECLINED'
  | 'EXPIRED'
  | 'PENDING_REVIEW'
  | 'NONE'

export type PhoneReadiness = 'ready' | 'pending_approval' | 'restricted' | 'blocked' | 'unknown'

export interface PhoneStatusInfo {
  readiness: PhoneReadiness
  label: string
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray'
  canDo: string[]
  cannotDo: string[]
  action?: string
  actionUrl?: string
  description: string
}

export interface MetaErrorGuidance {
  title: string
  guidance: string
  userAction?: string
}

export interface KapsoMessageResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

export interface KapsoMediaPayload {
  type: 'image' | 'document' | 'audio' | 'video' | 'sticker'
  url?: string
  id?: string
  caption?: string
  filename?: string
}

export interface KapsoSetupLink {
  id: string
  url: string
  customerId: string
  expiresAt: string
  status: 'pending' | 'completed' | 'expired'
}

export interface KapsoPhoneNumber {
  id: string
  phoneNumber: string
  phoneNumberId: string
  displayName?: string
  qualityRating?: string
  status: 'pending' | 'connected' | 'disconnected' | 'error'
  businessAccountId?: string
  verifiedName?: string
  nameStatus?: MetaNameStatus
  accountMode?: string
  isOfficialBusinessAccount?: boolean
  messagingLimitTier?: string
}

export interface KapsoCustomer {
  id: string
  externalId?: string
  phoneNumbers: KapsoPhoneNumber[]
  createdAt: string
}

export interface KapsoWebhookEvent {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          image?: { caption?: string; mime_type: string; sha256: string; id: string }
          document?: {
            caption?: string
            filename: string
            mime_type: string
            sha256: string
            id: string
          }
          audio?: { mime_type: string; sha256: string; id: string }
          video?: { caption?: string; mime_type: string; sha256: string; id: string }
          sticker?: { mime_type: string; sha256: string; id: string; animated: boolean }
          location?: { latitude: number; longitude: number; name?: string; address?: string }
          contacts?: Array<{
            name: { formatted_name: string }
            phones: Array<{ phone: string; type?: string }>
          }>
          interactive?: {
            type: string
            button_reply?: { id: string; title: string }
            list_reply?: { id: string; title: string; description?: string }
          }
        }>
        statuses?: Array<{
          id: string
          status: 'delivered' | 'read' | 'sent' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string }>
        }>
      }
      field: string
    }>
  }>
}

export interface SendWhatsAppMessageParams {
  phoneNumberId: string
  recipientPhone: string
  text?: string
  media?: {
    type: 'image' | 'document' | 'audio' | 'video'
    url?: string
    id?: string
    caption?: string
    filename?: string
  }
}

export interface SendWhatsAppMessageResult {
  success: boolean
  messageCount: number
  error?: string
}
