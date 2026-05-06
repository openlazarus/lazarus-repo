/**
 * WhatsApp Phone Number Status Map
 *
 * Combines Meta's name_status + quality_rating into a unified readiness model.
 * Uses lookup maps (no if/switch chains) for both phone-level and error-level status.
 *
 * Two layers:
 * 1. Phone-level status (from Meta API — always knowable)
 *    Derived from name_status + quality_rating
 *
 * 2. Conversation-level (24-hour window — per recipient, only known at send time)
 *    Within 24h of last user message → free-form messages work
 *    Outside 24h → only approved template messages work
 */

import { createLogger } from '@utils/logger'
const log = createLogger('whatsapp-status')

import type { MetaErrorGuidance, PhoneStatusInfo } from '@domains/whatsapp/types/whatsapp.types'

// ─── Name Status Map ─────────────────────────────────────────────────────────

const NAME_STATUS_MAP: Record<string, PhoneStatusInfo> = {
  AVAILABLE_WITHOUT_REVIEW: {
    readiness: 'pending_approval',
    label: 'Pending Approval',
    color: 'yellow',
    canDo: ['Receive incoming messages', 'Trigger agent executions from incoming messages'],
    cannotDo: [
      'Send any outbound messages (text, media, or templates)',
      'Reply to incoming messages',
    ],
    action:
      'Go to Meta Business Manager → WhatsApp Manager → Phone Numbers and submit the display name for review.',
    actionUrl: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers',
    description:
      'Your phone number is connected but the display name has not been reviewed by Meta yet. No outbound messages can be sent until the display name is approved.',
  },

  NON_EXISTS: {
    readiness: 'ready',
    label: 'Name Not Submitted',
    color: 'yellow',
    canDo: [
      'Send and receive messages within the 24-hour window',
      'Send approved template messages',
      'Trigger agent executions from incoming messages',
    ],
    cannotDo: ['Display a verified business name to recipients'],
    action:
      'No display name has been submitted for Meta review. Submit one to show your business name to recipients.',
    actionUrl: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers',
    description:
      'Your phone number is connected and operational, but no display name has been submitted for Meta review. Recipients will see the phone number instead of a business name.',
  },

  PENDING_REVIEW: {
    readiness: 'pending_approval',
    label: 'Under Review',
    color: 'yellow',
    canDo: ['Receive incoming messages', 'Trigger agent executions from incoming messages'],
    cannotDo: ['Send any outbound messages until review completes'],
    action: 'Your display name is being reviewed by Meta. This usually takes 1-3 business days.',
    actionUrl: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers',
    description:
      'Meta is reviewing your display name. Once approved, your agent will be able to send messages.',
  },

  DECLINED: {
    readiness: 'blocked',
    label: 'Name Declined',
    color: 'red',
    canDo: ['Receive incoming messages'],
    cannotDo: ['Send any outbound messages'],
    action:
      'Meta declined your display name. Submit a new display name that complies with their guidelines.',
    actionUrl: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers',
    description:
      'Your display name was rejected by Meta. You need to submit a new name before the agent can send messages.',
  },

  EXPIRED: {
    readiness: 'blocked',
    label: 'Approval Expired',
    color: 'red',
    canDo: ['Receive incoming messages'],
    cannotDo: ['Send any outbound messages'],
    action: 'Your display name approval has expired. Re-submit it for review.',
    actionUrl: 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers',
    description:
      'The display name approval has expired. Re-submit it in Meta Business Manager to resume sending.',
  },
}

// ─── Quality Rating Map (used when name_status = APPROVED) ───────────────────

const QUALITY_RATING_MAP: Record<string, PhoneStatusInfo> = {
  GREEN: {
    readiness: 'ready',
    label: 'Ready',
    color: 'green',
    canDo: [
      'Send and receive messages freely within the 24-hour window',
      'Send approved template messages at any time',
      'Send media, interactive, and location messages',
    ],
    cannotDo: [
      "Send free-form messages to users who haven't messaged in the last 24 hours (use templates instead)",
    ],
    description:
      "Your number is fully operational. Free-form messages can only be sent within 24 hours of the user's last message. Outside that window, use approved template messages.",
  },

  YELLOW: {
    readiness: 'restricted',
    label: 'Quality Warning',
    color: 'orange',
    canDo: ['Send and receive messages (with reduced limits)', 'Send approved template messages'],
    cannotDo: [
      'Send at full rate — messaging limits may be reduced',
      'Send free-form messages outside the 24-hour window',
    ],
    action:
      'Your quality rating is degraded. Review your message content and frequency to avoid further restrictions.',
    description:
      'Meta has flagged quality issues with your messaging. This can happen due to high block/report rates. Messaging limits may be reduced.',
  },

  RED: {
    readiness: 'restricted',
    label: 'Quality Restricted',
    color: 'red',
    canDo: ['Receive incoming messages', 'Send approved template messages (limited)'],
    cannotDo: ['Send at normal rate — severely limited', 'Messaging tier may be downgraded'],
    action:
      'Your quality rating is critical. Immediately review your messaging practices to prevent the number from being disabled.',
    description:
      'Meta has severely restricted your messaging due to poor quality signals (blocks, reports). Take immediate action.',
  },
}

const DEFAULT_APPROVED_STATUS: PhoneStatusInfo = {
  readiness: 'ready',
  label: 'Ready',
  color: 'green',
  canDo: [
    'Send and receive messages within the 24-hour window',
    'Send approved template messages at any time',
  ],
  cannotDo: ['Send free-form messages outside the 24-hour window'],
  description:
    'Your number is approved and operational. Quality rating is not yet determined by Meta.',
}

const UNKNOWN_STATUS: PhoneStatusInfo = {
  readiness: 'unknown',
  label: 'Unknown Status',
  color: 'gray',
  canDo: ['Receive incoming messages (likely)'],
  cannotDo: ['Sending may or may not work — status could not be determined'],
  action: 'Open WhatsApp settings and refresh to fetch the latest status from Meta.',
  description:
    'Could not determine the phone number status. This may happen if the Meta API is temporarily unavailable.',
}

// ─── Meta Error Code Map ─────────────────────────────────────────────────────

const META_ERROR_MAP: Record<number, MetaErrorGuidance> = {
  131037: {
    title: 'Display name not approved',
    guidance:
      "This phone number's display name has not been approved by Meta yet. No messages (including templates) can be sent until the display name is reviewed and approved.",
    userAction:
      'The workspace owner needs to check Meta Business Manager → WhatsApp Manager → Phone Numbers and submit the display name for review.',
  },
  131026: {
    title: 'Recipient not on WhatsApp',
    guidance: 'The recipient phone number is not registered on WhatsApp.',
  },
  131047: {
    title: 'Re-engagement required',
    guidance:
      "More than 24 hours have passed since the user's last message. Use `whatsapp_send_template` to send an approved template message instead. Use `whatsapp_list_templates` to see available templates.",
    userAction:
      'This is normal WhatsApp behavior. The agent should use template messages to re-engage the user.',
  },
  131056: {
    title: 'Rate limited',
    guidance:
      'Too many messages sent. Meta has rate-limited this number. Wait a few minutes before trying again.',
    userAction:
      'Reduce message frequency. If this persists, check your messaging limit tier in Meta Business Manager.',
  },
  132000: {
    title: 'Template not found',
    guidance:
      'The message template was not found or is not approved. Use `whatsapp_list_templates` to see available approved templates.',
    userAction: 'Create and get templates approved in Meta Business Manager before using them.',
  },
  131053: {
    title: 'Media too large',
    guidance: 'The media file is too large. WhatsApp has a 16MB limit for media messages.',
  },
  131031: {
    title: 'Account not registered',
    guidance:
      'This WhatsApp Business account is not fully registered. Complete the setup in Meta Business Manager.',
    userAction: 'Complete the WhatsApp Business registration in Meta Business Manager.',
  },
}

/** Pattern-based fallback for errors not matched by code */
const ERROR_PATTERN_MAP: Array<{ pattern: RegExp; guidance: MetaErrorGuidance }> = [
  {
    pattern: /24[- ]?hour window/i,
    guidance: {
      title: '24-hour window expired',
      guidance:
        'The 24-hour conversation window has expired for this recipient. Use `whatsapp_send_template` to send an approved template message instead. Use `whatsapp_list_templates` to see available templates.',
      userAction:
        'This is normal WhatsApp behavior. The agent should use template messages to re-engage the user.',
    },
  },
  {
    pattern: /display name approval/i,
    guidance: META_ERROR_MAP[131037]!,
  },
  {
    pattern: /rate limit/i,
    guidance: META_ERROR_MAP[131056]!,
  },
  {
    pattern: /template/i,
    guidance: META_ERROR_MAP[132000]!,
  },
]

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Derive the phone readiness status from Meta fields.
 */
export function getPhoneStatus(
  nameStatus?: string | null,
  qualityRating?: string | null,
): PhoneStatusInfo {
  if (!nameStatus || nameStatus === 'NONE') {
    return UNKNOWN_STATUS
  }

  // Name approved — quality rating determines the rest
  if (nameStatus === 'APPROVED') {
    return QUALITY_RATING_MAP[qualityRating || ''] || DEFAULT_APPROVED_STATUS
  }

  // All other name statuses
  return NAME_STATUS_MAP[nameStatus] || UNKNOWN_STATUS
}

/**
 * Get error guidance from a Meta error code or error body string.
 */
export function getMetaErrorGuidance(
  _statusCode: number,
  errorBody: string,
): MetaErrorGuidance | null {
  // Try to extract Meta error code from JSON body
  try {
    const parsed = JSON.parse(errorBody)
    const metaCode = parsed?.error?.code
    if (metaCode && META_ERROR_MAP[metaCode]) {
      return META_ERROR_MAP[metaCode]
    }
  } catch (err) {
    log.debug({ err }, 'Not JSON — fall through to pattern matching')
  }

  // Pattern-based fallback
  for (const { pattern, guidance } of ERROR_PATTERN_MAP) {
    if (pattern.test(errorBody)) {
      return guidance
    }
  }

  return null
}
