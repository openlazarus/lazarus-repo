import { Item } from './item'
import { Tag } from './tag'

/**
 * Role enum for Message participants - aligned with database CHECK constraint
 *
 * DOMAIN MODEL: This represents message roles at the database/API level.
 * For UI-specific message roles (e.g., 'assistant', 'permission'), see components/ui/chat/types.ts
 *
 * - 'user': Messages from the end user
 * - 'agent': Messages from AI agents (stored as 'agent' in DB)
 * - 'system': System-generated messages
 */
export type MessageRole = 'user' | 'agent' | 'system'

/**
 * Message status - aligned with database CHECK constraint
 *
 * DOMAIN MODEL: This represents message status at the database/API level.
 * For UI-specific message statuses (e.g., 'delivered', 'read', 'failed'), see components/ui/chat/types.ts
 *
 * - 'sending': Message is being sent
 * - 'sent': Message has been sent successfully
 * - 'error': Message failed to send
 * - 'received': Message has been received
 */
export type MessageStatus = 'sending' | 'sent' | 'error' | 'received'

/**
 * Simple action types for message interactions
 */
export type MessageActionType =
  | 'accept' // Accept/approve something
  | 'reject' // Reject/decline something
  | 'option' // Generic option/choice

/**
 * Simple message action interface for iMessage-style rows
 */
export interface MessageAction {
  id: string // Unique identifier for the action
  type: MessageActionType // Type of action
  label: string // Display text
  data?: any // Action-specific data
}

/**
 * Selected action tracking for message logs
 */
export interface SelectedAction {
  action: MessageAction
  selectedAt: string
  canRestore?: boolean
}

/**
 * Checkpoint data for rollback functionality
 */
export interface CheckpointData {
  fileId: string
  originalContent: string
  modifiedContent: string
  timestamp: string
  description?: string
}

/**
 * Message model - extends the base Item and aligns with database schema
 */
export interface Message extends Item {
  type: 'message'
  content: string
  role: MessageRole
  conversationId: string
  status?: MessageStatus
  isEdited?: boolean

  // Store actual tag relationships (aligns with database tagged_items JSONB)
  taggedItems?: Tag[]

  // Simple actions for interactive messages
  actions?: MessageAction[]

  // Track selected action and checkpoint for restore functionality
  selectedAction?: SelectedAction
  checkpointData?: CheckpointData[]

  // Legacy reaction field (now handled through actions)
  reaction?: 'accept' | 'reject'
}

/**
 * Create a new Message with default values
 */
export function createMessage(partial: Partial<Message> = {}): Message {
  const now = new Date().toISOString()

  return {
    id:
      partial.id ||
      Date.now().toString(36) + Math.random().toString(36).substring(2),
    type: 'message',
    content: partial.content || '',
    role: partial.role || 'user',
    conversationId: partial.conversationId || '',
    status: partial.status || 'sent',
    isEdited: partial.isEdited || false,
    workspaceId: partial.workspaceId || '',
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    metadata: partial.metadata || {},
    labels: partial.labels || [],
    taggedItems: partial.taggedItems || [],
    actions: partial.actions || [],
    reaction: partial.reaction,
    selectedAction: partial.selectedAction,
    checkpointData: partial.checkpointData || [],
  }
}

/**
 * Helper function to create simple actions
 */
export const createAction = {
  accept: (data?: any): MessageAction => ({
    id: 'accept',
    type: 'accept',
    label: 'Accept',
    data,
  }),

  reject: (data?: any): MessageAction => ({
    id: 'reject',
    type: 'reject',
    label: 'Reject',
    data,
  }),

  option: (id: string, label: string, data?: any): MessageAction => ({
    id,
    type: 'option',
    label,
    data,
  }),
}

// Re-export Tag for convenience when working with message tagged items
export type { Tag } from './tag'
