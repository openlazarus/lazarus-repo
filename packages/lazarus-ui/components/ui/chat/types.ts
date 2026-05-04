// Chat component types

import { FileType } from '@/model/file'

/**
 * UI-SPECIFIC: Message role for chat component rendering
 *
 * This is separate from the domain MessageRole in @/model/message
 * - 'user': Messages from the end user
 * - 'assistant': Messages from AI assistant (displayed as 'assistant' in UI, may be stored as 'agent' in DB)
 * - 'system': System messages
 * - 'permission': Permission request messages (UI-only, not persisted)
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'permission'

/**
 * UI-SPECIFIC: Message status for chat component rendering
 *
 * This is separate from the domain MessageStatus in @/model/message
 * Provides more granular client-side status tracking for better UX
 * - 'sending': Message is being sent
 * - 'sent': Message has been sent
 * - 'failed': Message failed to send (more specific than 'error')
 * - 'delivered': Message has been delivered to recipient
 * - 'read': Message has been read by recipient
 */
export type MessageStatus = 'sending' | 'sent' | 'failed' | 'delivered' | 'read'
export type ReactionType = 'accept' | 'reject'
export type TapbackType =
  | 'thumbsUp'
  | 'thumbsDown'
  | 'heart'
  | 'haha'
  | 'exclamation'
  | 'question'

// Ask-user question request interface
export interface AskUserQuestionRequest {
  requestId: string
  sessionId: string
  questions: Array<{
    question: string
    header: string
    options: Array<{ label: string; description: string }>
    multiSelect: boolean
  }>
  timestamp: string
}

// Permission request interface
export interface PermissionRequest {
  requestId: string
  sessionId: string
  conversationId?: string
  claudeSessionId?: string
  toolName: string
  toolUseId?: string
  parameters: any
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskDisplay: string
  description: string
  factors?: string[]
  timestamp: string
}

// Template card data for onboarding/workspace design
export interface TemplateCardData {
  id: string
  name: string
  description: string
  category: string
  folderCount: number
  agentCount: number
  databaseCount: number
  agents: { name: string; description: string }[]
  folders: string[]
  featured?: boolean
}

// Message variant types - extensible message content
export type MessageVariant =
  | { type: 'text'; content: string; status?: MessageStatus }
  | {
      type: 'action'
      actions: MessageAction[]
      selectedActionId?: string | null
    }
  | { type: 'error'; content: string; retryable: boolean }
  | { type: 'tag'; tag: MessageTag; tags?: MessageTag[] }
  | { type: 'selected-action'; actionLabel: string; originalMessageId: string }
  | {
      type: 'background-action'
      title: string
      status: 'executing' | 'success' | 'failed'
      description?: string
      details?: string
      expandable?: boolean
    }
  | {
      type: 'execution-plan'
      title: string
      todos: ExecutionPlanTodo[]
      expandable?: boolean
    }
  | { type: 'permission'; request: PermissionRequest }
  | { type: 'ask-user-question'; request: AskUserQuestionRequest }
  | {
      type: 'template-card'
      templates: TemplateCardData[]
      selectable?: boolean
    }

// Base message interface
export interface BaseMessage {
  id: string
  role: MessageRole
  timestamp: Date
  variant: MessageVariant
}

// Full chat message with all properties
export interface ChatMessage extends BaseMessage {
  metadata?: {
    model?: string
    tokens?: number
    latency?: number
    edited?: boolean
    editedAt?: Date
    permissionResponse?: { allowed: boolean; reason?: string }
    askUserResponse?: { answers: Record<string, string> }
    isStreaming?: boolean
    toolCalls?: Array<{
      id: string
      name: string
      arguments?: any
      status: 'pending' | 'running' | 'completed' | 'error'
      result?: any
    }>
  }
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  tapbacks?: Tapback[]
  forceNoTail?: boolean
}

// Helper type guards
export const isTextMessage = (
  msg: ChatMessage,
): msg is ChatMessage & { variant: { type: 'text' } } =>
  msg.variant.type === 'text'

export const isActionMessage = (
  msg: ChatMessage,
): msg is ChatMessage & { variant: { type: 'action' } } =>
  msg.variant.type === 'action'

export const isErrorMessage = (
  msg: ChatMessage,
): msg is ChatMessage & { variant: { type: 'error' } } =>
  msg.variant.type === 'error'

export const isTagMessage = (
  msg: ChatMessage,
): msg is ChatMessage & { variant: { type: 'tag' } } =>
  msg.variant.type === 'tag'

export const isSelectedActionMessage = (
  msg: ChatMessage,
): msg is ChatMessage & { variant: { type: 'selected-action' } } =>
  msg.variant.type === 'selected-action'

export interface MessageAction {
  id: string
  label: string
  type?: 'accept' | 'reject' | 'option'
  data?: any
}

export interface MessageAttachment {
  id: string
  type: 'image' | 'file' | 'video' | 'audio'
  url: string
  name: string
  size?: number
}

export interface MessageReaction {
  id: string
  emoji: string
  userId: string
  timestamp: Date
}

// New interfaces for reactions
export interface Tapback {
  id: string
  type: TapbackType
  userId: string
  timestamp: Date
}

export interface MessageTag {
  id: string
  // Support all item types that can be tagged
  // 'directory' = folder, 'file' = regular file (with fileType for subtype)
  // 'app' = connected app (source), 'agent' = workspace agent
  type:
    | 'app'
    | 'file'
    | 'directory'
    | 'conversation'
    | 'source'
    | 'agent'
    | 'activity'
    | 'message'
    | 'link'
  name?: string
  title?: string
  icon?: string
  preview?: string
  isFromAI?: boolean
  fileType?: FileType // For files: document, code, image, etc. For special views: agents_collection, sources_collection, etc.
  app_type?: string
  path?: string // File/folder path
  updatedAt?: Date
  metadata?: any
}

export interface ExecutionPlanTodo {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  updates?: ExecutionPlanUpdate[]
}

export interface ExecutionPlanUpdate {
  id: string
  content: string
  timestamp: Date
}

export interface ChatContainerProps {
  className?: string
  children: React.ReactNode
  variant?: 'mobile' | 'desktop'
}

export interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
  showTypingIndicator?: boolean
  onMessageVisible?: (messageId: string) => void
  onActionClick?: (messageId: string, actionId: string) => void
  onRevertAction?: (messageId: string) => void
  onRetry?: (messageId: string) => void
  onReactionClick?: (messageId: string, reaction: ReactionType) => void
  onTapbackClick?: (messageId: string, tapback: TapbackType) => void
  onTagClick?: (tag: MessageTag) => void
  onPermissionRespond?: (
    sessionId: string,
    requestId: string,
    allowed: boolean,
    reason?: string,
  ) => void
  onAskUserQuestionRespond?: (
    sessionId: string,
    requestId: string,
    answers: Record<string, string>,
  ) => void
  className?: string
  variant?: 'mobile' | 'desktop'
}

export interface MessageProps {
  message: ChatMessage
  isGrouped?: boolean
  isLastInGroup?: boolean
  showTimestamp?: boolean
  onRetry?: (messageId: string) => void
  onReactionClick?: (messageId: string, reaction: ReactionType) => void
  onTapbackClick?: (messageId: string, tapback: TapbackType) => void
  onTagClick?: (tag: MessageTag) => void
  className?: string
  variant?: 'mobile' | 'desktop'
}

export interface MessageGroupProps {
  messages: ChatMessage[]
  role: MessageRole
  timestamp: Date
  onReactionClick?: (messageId: string, reaction: ReactionType) => void
  onTapbackClick?: (messageId: string, tapback: TapbackType) => void
  onTagClick?: (tag: MessageTag) => void
  className?: string
  variant?: 'mobile' | 'desktop'
}

export interface TypingIndicatorProps {
  isVisible: boolean
  userName?: string
  className?: string
}

export interface ScrollAnchorProps {
  trackVisibility?: boolean
  className?: string
}
