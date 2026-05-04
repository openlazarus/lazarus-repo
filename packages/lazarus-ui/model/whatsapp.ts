export type PhoneStatusColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray'

export type PhoneReadiness =
  | 'ready'
  | 'pending_approval'
  | 'restricted'
  | 'blocked'
  | 'unknown'

export type PhoneStatusInfo = {
  readiness: PhoneReadiness
  label: string
  color: PhoneStatusColor
  canDo: string[]
  cannotDo: string[]
  action?: string
  actionUrl?: string
  description: string
}

export type WhatsAppConfig = {
  enabled: boolean
  phoneNumber?: string
  phoneNumberId?: string
  displayName?: string
  status: 'pending' | 'connected' | 'disconnected' | 'error'
  qualityRating?: string
  provisionedByLazarus: boolean
  connectedAt?: string
  verifiedName?: string
  nameStatus?: string
  businessAccountId?: string
  accountMode?: string
  messagingLimitTier?: string
  templateCount?: number
  templates?: Array<{
    name: string
    status: string
    language: string
    category: string
  }>
  stale?: boolean
  phoneStatus?: PhoneStatusInfo
}
