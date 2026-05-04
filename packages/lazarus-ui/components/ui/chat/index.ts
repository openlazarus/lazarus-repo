// Main Chat components
export { Chat } from './chat'
export { ChatContainer } from './chat-container'
export { ChatView } from './chat-view'
export { MessageList } from './message-list'
export { MessageRenderer } from './message-renderer'
export { PinnedExecutionPlan } from './pinned-execution-plan'
export { TypingIndicator } from './typing-indicator'

// Message variant components
export {
  ActionMessage,
  BackgroundActionMessage,
  ErrorMessage,
  ExecutionPlanMessage,
  PermissionActionMessage,
  SelectedActionMessage,
  TagMessage,
  TemplateCardMessage,
  TextMessage,
} from './messages'

// Export types from message variants
export type { ChatViewProps } from './chat-view'
export type { ActionMessageProps } from './messages/action-message'
export type { ErrorMessageProps } from './messages/error-message'
export type { ExecutionPlanMessageProps } from './messages/execution-plan-message'
export type { PermissionActionMessageProps } from './messages/permission-action-message'
export type { BackgroundActionMessageProps } from './messages/progress-message'
export type { SelectedActionMessageProps } from './messages/selected-action-message'
export type { TagMessageProps } from './messages/tag-message'
export type { TextMessageProps } from './messages/text-message'

// Message factory utilities
export {
  addReactionsToMessage,
  createActionMessage,
  createBackgroundActionMessage,
  createErrorMessage,
  createExecutionPlanMessage,
  createPermissionMessage,
  createProgressMessage,
  createSelectedActionMessage,
  createTagMessage,
  createTextMessage,
  updateMessageMetadata,
} from './utils/message-factory'

// Re-export specific types for convenience
export type {
  ChatContainerProps,
  ChatMessage,
  ExecutionPlanTodo,
  ExecutionPlanUpdate,
  MessageAction,
  MessageAttachment,
  MessageListProps,
  MessageReaction,
  MessageRole,
  MessageStatus,
  MessageTag,
  MessageVariant,
  ReactionType,
  TapbackType,
  TemplateCardData,
} from './types'
