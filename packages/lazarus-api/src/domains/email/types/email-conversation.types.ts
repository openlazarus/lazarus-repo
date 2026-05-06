// ---------------------------------------------------------------------------
// Domain types for email conversation threading
// ---------------------------------------------------------------------------

/** Row shape returned from email_conversations table */
export type ConversationRow = {
  id: string
  message_count: number
  thread_root_message_id: string | null
}

/** Fields required to insert a new conversation */
export type ConversationInsert = {
  workspace_id: string
  agent_id: string
  thread_root_message_id?: string | null
  normalized_subject?: string | null
  sender_email: string
  message_count: number
}

/** Fields required to insert a message */
export type MessageInsert = {
  email_conversation_id: string
  email_message_id?: string | null
  in_reply_to?: string | null
  reference_ids: string[]
  sender_email: string
  sender_name?: string | null
  subject: string
  content: string
  is_from_bot: boolean
  direction: 'inbound' | 'outbound'
  attachments: any[]
  ses_message_id?: string | null
}

/** Subset of email_messages used to render conversation history */
export type MessageRow = {
  sender_email: string
  sender_name: string | null
  content: string
  is_from_bot: boolean
  created_at: string
  attachments: Array<{ filename: string; size?: number }>
}

/** Headers extracted from an incoming email for thread detection */
export type EmailThreadingHeaders = {
  inReplyTo?: string
  references?: string[]
  emailMessageId?: string
  subject: string
  senderEmail: string
}

/** Result of getOrCreateConversation */
export type ConversationContext = {
  id: string
  isNewConversation: boolean
  messageCount: number
  threadRootMessageId?: string
}

/** Data needed to store a message in a conversation */
export type StoreMessageData = {
  emailMessageId?: string
  inReplyTo?: string
  referenceIds?: string[]
  senderEmail: string
  senderName?: string
  subject: string
  content: string
  isFromBot: boolean
  direction: 'inbound' | 'outbound'
  attachments?: any[]
  sesMessageId?: string
}

/** RFC 2822 threading headers for outbound replies */
export type ThreadHeaders = {
  inReplyTo?: string
  references: string[]
  threadRootMessageId?: string
}
