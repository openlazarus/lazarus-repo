import {
  ChatMessage,
  ExecutionPlanTodo,
  MessageAction,
  MessageRole,
  MessageStatus,
  MessageTag,
  PermissionRequest,
} from '../types'

/**
 * Factory functions for creating different types of chat messages
 * These helpers ensure type safety and consistency when creating messages
 */

// Base message creation
function createBaseMessage(role: MessageRole): Omit<ChatMessage, 'variant'> {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    timestamp: new Date(),
    metadata: {},
  }
}

// Text message
export function createTextMessage(
  role: MessageRole,
  content: string,
  status?: MessageStatus,
): ChatMessage {
  return {
    ...createBaseMessage(role),
    variant: {
      type: 'text',
      content,
      status,
    },
  }
}

// Action message
export function createActionMessage(actions: MessageAction[]): ChatMessage {
  return {
    ...createBaseMessage('assistant'),
    variant: {
      type: 'action',
      actions,
    },
  }
}

// Error message
export function createErrorMessage(
  content: string,
  retryable: boolean = true,
  role: MessageRole = 'assistant',
): ChatMessage {
  return {
    ...createBaseMessage(role),
    variant: {
      type: 'error',
      content,
      retryable,
    },
  }
}

// Tag message
export function createTagMessage(
  tag: MessageTag,
  role: MessageRole = 'user',
): ChatMessage {
  return {
    ...createBaseMessage(role),
    variant: {
      type: 'tag',
      tag,
    },
  }
}

// Selected action message
export function createSelectedActionMessage(
  actionLabel: string,
  originalMessageId: string,
): ChatMessage {
  return {
    ...createBaseMessage('user'),
    variant: {
      type: 'selected-action',
      actionLabel,
      originalMessageId,
    },
  }
}

// Background action message
export function createBackgroundActionMessage(
  title: string,
  status: 'executing' | 'success' | 'failed' = 'executing',
  description?: string,
  details?: string,
  expandable?: boolean,
): ChatMessage {
  return {
    ...createBaseMessage('assistant'),
    variant: {
      type: 'background-action',
      title,
      status,
      description,
      details,
      expandable,
    },
  }
}

// Legacy progress message support - automatically creates background action
export function createProgressMessage(
  title: string,
  progress: number,
  description?: string,
): ChatMessage {
  // Convert progress to status
  const status = progress >= 100 ? 'success' : 'executing'

  return createBackgroundActionMessage(
    title,
    status,
    description,
    undefined,
    false,
  )
}

// Helper to add reactions/tapbacks to existing messages
export function addReactionsToMessage(
  message: ChatMessage,
  reactions?: any[],
  tapbacks?: any[],
): ChatMessage {
  return {
    ...message,
    reactions,
    tapbacks,
  }
}

// Helper to update message metadata
export function updateMessageMetadata(
  message: ChatMessage,
  metadata: Partial<ChatMessage['metadata']>,
): ChatMessage {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      ...metadata,
    },
  }
}

// Execution plan message
export function createExecutionPlanMessage(
  title: string,
  todos: ExecutionPlanTodo[],
  expandable?: boolean,
): ChatMessage {
  return {
    ...createBaseMessage('assistant'),
    variant: {
      type: 'execution-plan',
      title,
      todos,
      expandable,
    },
  }
}

// Permission request message
export function createPermissionMessage(
  request: PermissionRequest,
  response?: { allowed: boolean; reason?: string },
): ChatMessage {
  return {
    ...createBaseMessage('permission'),
    variant: {
      type: 'permission',
      request,
    },
    metadata: response ? { permissionResponse: response } : undefined,
  }
}
