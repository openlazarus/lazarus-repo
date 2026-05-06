import { create } from 'zustand'

import { updateBalanceFromEvent } from '@/hooks/billing/use-credits'
import {
  ChatAPIService,
  ChatEvent,
  PermissionRequest,
} from '@/services/chat-api.service'

import { TaggedItem } from './tag-store'

/**
 * Tool call state for tracking tool executions
 */
export interface ToolCall {
  id: string
  name: string
  arguments?: any
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: any
  timestamp: Date
}

/**
 * System events for tracking internal operations
 */
export interface SystemEvent {
  type: 'memory' | 'thinking' | 'planning' | 'progress' | 'status'
  content: string
  metadata?: any
  timestamp: Date
}

/**
 * Internal message representation for the store
 * This will be converted to UI ChatMessage format in components
 */
export interface StoreMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'permission'
  content?: string
  timestamp: Date
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  metadata?: any
  variant?: any // For special message types (permission, etc)
}

/**
 * Per-conversation state - completely isolated
 */
export interface ConversationState {
  conversationId: string
  messages: StoreMessage[]
  sessionId: string | null
  isStreaming: boolean
  streamController: AbortController | null
  activeToolCalls: ToolCall[]
  systemEvents: SystemEvent[]
  error: string | null
  lastUpdated: Date
}

/**
 * Chat stream manager configuration
 */
interface ChatConfig {
  workspaceId?: string | null
  agentId?: string
  mcpServers?: string[]
  systemPrompt?: string
  maxTurns?: number
  temperature?: number
  requirePermissions?: boolean
}

/**
 * Event handlers for chat streams
 */
interface ChatEventHandlers {
  onPermissionRequest?: (
    conversationId: string,
    request: PermissionRequest,
  ) => void
  onConversationCreated?: (
    conversationId: string,
    sessionId: string,
    title: string,
  ) => void
  onError?: (conversationId: string, error: string) => void
}

/**
 * Chat store state
 */
interface ChatStore {
  // State
  conversations: Map<string, ConversationState>
  config: ChatConfig
  eventHandlers: ChatEventHandlers

  // Chat services (one per conversation)
  chatServices: Map<string, ChatAPIService>

  // Configuration
  setConfig: (config: Partial<ChatConfig>) => void
  setEventHandlers: (handlers: ChatEventHandlers) => void

  // Conversation management
  getConversation: (conversationId: string) => ConversationState | undefined
  createConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void

  // Message operations
  sendMessage: (
    conversationId: string,
    content: string,
    userId: string,
    taggedItems?: TaggedItem[],
  ) => Promise<void>
  // Conversation loading is owned by `<ConversationLoader>` (workspace API
  // hooks). The store exposes pure state setters only.
  ensureConversation: (conversationId: string) => void
  applyConversationData: (
    conversationId: string,
    conversation: any,
    rawMessages: any[],
  ) => void

  // Stream control
  cancelStream: (conversationId: string) => void
  cancelAllStreams: () => void

  // Permission handling — pure state setter; component owns the API call
  markPermissionResponded: (
    conversationId: string,
    requestId: string,
    allowed: boolean,
    reason?: string,
  ) => void

  // Ask-user question handling — pure state setter; component owns the API call
  markAskUserResponded: (
    conversationId: string,
    requestId: string,
    answers: Record<string, string>,
  ) => void

  // Internal state updates
  updateConversation: (
    conversationId: string,
    updates: Partial<ConversationState>,
  ) => void
  addMessage: (conversationId: string, message: StoreMessage) => void
  updateLastMessage: (
    conversationId: string,
    updates: Partial<StoreMessage>,
  ) => void
  addToolCall: (conversationId: string, toolCall: ToolCall) => void
  updateToolCall: (
    conversationId: string,
    toolId: string,
    updates: Partial<ToolCall>,
  ) => void
  addSystemEvent: (conversationId: string, event: SystemEvent) => void
}

/**
 * Main chat store using Zustand
 * Manages all conversation states with proper isolation
 */
export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  conversations: new Map(),
  config: {},
  eventHandlers: {},
  chatServices: new Map(),

  // Configuration
  setConfig: (config) => {
    set({ config: { ...get().config, ...config } })
  },

  setEventHandlers: (handlers) => {
    set({ eventHandlers: { ...get().eventHandlers, ...handlers } })
  },

  // Conversation management
  getConversation: (conversationId) => {
    return get().conversations.get(conversationId)
  },

  createConversation: (conversationId) => {
    const { conversations } = get()

    // Don't recreate if it already exists
    if (conversations.has(conversationId)) {
      console.log('[ChatStore] Conversation already exists:', conversationId)
      return
    }

    const newState: ConversationState = {
      conversationId,
      messages: [],
      sessionId: null,
      isStreaming: false,
      streamController: null,
      activeToolCalls: [],
      systemEvents: [],
      error: null,
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, newState),
    })

    console.log('[ChatStore] Created conversation:', conversationId)
  },

  deleteConversation: (conversationId) => {
    const { conversations, chatServices } = get()

    // Cancel any active stream
    get().cancelStream(conversationId)

    // Clean up service
    const service = chatServices.get(conversationId)
    if (service) {
      chatServices.delete(conversationId)
    }

    // Remove conversation
    const newConversations = new Map(conversations)
    newConversations.delete(conversationId)

    set({
      conversations: newConversations,
      chatServices: new Map(chatServices),
    })

    console.log('[ChatStore] Deleted conversation:', conversationId)
  },

  // Message operations
  sendMessage: async (conversationId, content, userId, taggedItems) => {
    console.log('[ChatStore] sendMessage called:', {
      conversationId,
      content,
      userId,
      taggedItemsCount: taggedItems?.length || 0,
    })

    let conversation = get().conversations.get(conversationId)

    // Auto-create conversation if it doesn't exist (handles race condition with createConversation)
    if (!conversation) {
      console.log(
        '[ChatStore] Conversation not found, creating it now:',
        conversationId,
      )
      get().createConversation(conversationId)
      conversation = get().conversations.get(conversationId)
    }

    if (!conversation) {
      console.error(
        '[ChatStore] Cannot send message - failed to create conversation:',
        conversationId,
      )
      return
    }

    if (conversation.isStreaming) {
      console.warn(
        '[ChatStore] Cannot send message - already streaming:',
        conversationId,
      )
      return
    }

    // Add user message
    const userMessage: StoreMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    get().addMessage(conversationId, userMessage)
    console.log('[ChatStore] User message added')

    // If there are tagged items, add a tag message to show what was shared
    if (taggedItems && taggedItems.length > 0) {
      // Convert TaggedItems to message tags
      // TaggedItem already has the proper type from the new tag store
      const tags = taggedItems.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name || 'Untitled',
        icon: item.icon,
        fileType: item.fileType,
        app_type: item.appType,
        path: item.path,
      }))

      const tagMessage: StoreMessage = {
        id: `tag_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        role: 'user',
        timestamp: new Date(),
        variant: {
          type: 'tag',
          tag: tags[0],
          tags: tags.length > 1 ? tags : undefined,
        },
      }

      get().addMessage(conversationId, tagMessage)
      console.log('[ChatStore] Tag message added for', tags.length, 'items')
    }

    // Set streaming state
    get().updateConversation(conversationId, {
      isStreaming: true,
      error: null,
    })

    try {
      // Get or create chat service
      let service = get().chatServices.get(conversationId)
      if (!service) {
        console.log('[ChatStore] Creating new ChatAPIService')
        service = new ChatAPIService()
        get().chatServices.set(conversationId, service)
      }

      // Set resume session if we have one
      const currentState = get().conversations.get(conversationId)
      if (currentState?.sessionId) {
        console.log(
          '[ChatStore] Setting resume session ID:',
          currentState.sessionId,
        )
        service.setResumeSessionId(currentState.sessionId)
      }

      // Create abort controller
      const abortController = new AbortController()
      get().updateConversation(conversationId, {
        streamController: abortController,
      })

      console.log('[ChatStore] Starting stream with config:', get().config)

      // Start streaming
      const stream = service.streamChat({
        message: content,
        workspaceId: get().config.workspaceId || undefined,
        agentId: get().config.agentId,
        mcpServers: get().config.mcpServers,
        systemPrompt: get().config.systemPrompt,
        maxTurns: get().config.maxTurns,
        temperature: get().config.temperature,
        requirePermissions: get().config.requirePermissions,
      })

      // Process events
      let assistantMessageId: string | null = null
      let assistantContent = ''
      let eventCount = 0

      let activeConversationId = conversationId
      for await (const event of stream) {
        eventCount++
        console.log('[ChatStore] Received event:', event.type, eventCount)

        // Check if stream was cancelled
        if (abortController.signal.aborted) {
          console.log('[ChatStore] Stream aborted')
          break
        }

        await handleChatEvent(
          event,
          activeConversationId,
          get,
          (id, content) => {
            assistantMessageId = id
            assistantContent = content
          },
        )

        // After conversation_info migrates the entry to the real id, switch
        // subsequent event dispatch to use it so messages land in the right bucket.
        if (
          event.type === 'conversation_info' &&
          event.metadata?.conversationId &&
          event.metadata.conversationId !== activeConversationId
        ) {
          activeConversationId = event.metadata.conversationId
        }
      }

      console.log('[ChatStore] Stream completed. Total events:', eventCount)

      // Stream completed
      get().updateConversation(activeConversationId, {
        isStreaming: false,
        streamController: null,
      })

      // Mark assistant message as complete
      if (assistantMessageId) {
        get().updateLastMessage(activeConversationId, {
          isStreaming: false,
        })
      }
    } catch (error) {
      console.error('[ChatStore] Error sending message:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      get().updateConversation(conversationId, {
        isStreaming: false,
        error: errorMessage,
        streamController: null,
      })

      // Call error handler
      get().eventHandlers.onError?.(conversationId, errorMessage)
    }
  },

  // Pure state setter: ensures the conversation slot exists. The actual fetch
  // is owned by `<ConversationLoader>` (which uses workspace-aware atomic hooks)
  // and writes back via `applyConversationData`.
  ensureConversation: (conversationId) => {
    const state = get()
    if (!state.conversations.has(conversationId)) {
      state.createConversation(conversationId)
    }
  },

  // Pure state setter: applies conversation metadata + messages fetched by the
  // workspace API hooks into the store.
  applyConversationData: (conversationId, conversation, rawMessages) => {
    const state = get()
    if (!state.conversations.has(conversationId)) {
      state.createConversation(conversationId)
    }

    if (!conversation) {
      state.updateConversation(conversationId, {
        error: 'Conversation not found',
      })
      return
    }

    const messages: StoreMessage[] = (rawMessages || []).map((msg: any) => ({
      id: msg.id,
      role: msg.role === 'agent' ? 'assistant' : msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp || msg.createdAt),
      metadata: msg.metadata,
      toolCalls: msg.toolCalls,
      variant: msg.variant,
    }))

    state.updateConversation(conversationId, {
      messages,
      sessionId:
        conversation.sessionId || conversation.metadata?.sessionId || null,
      lastUpdated: new Date(),
    })
  },

  // Stream control
  cancelStream: (conversationId) => {
    const conversation = get().conversations.get(conversationId)

    if (conversation?.streamController) {
      console.log('[ChatStore] Cancelling stream:', conversationId)
      conversation.streamController.abort()

      // Also abort the underlying fetch request so the backend sees the disconnect
      const service = get().chatServices.get(conversationId)
      if (service) {
        service.abort()
      }

      get().updateConversation(conversationId, {
        isStreaming: false,
        streamController: null,
      })
    }
  },

  cancelAllStreams: () => {
    const { conversations, chatServices } = get()

    console.log('[ChatStore] Cancelling all streams')

    conversations.forEach((conversation, conversationId) => {
      if (conversation.streamController) {
        conversation.streamController.abort()
      }
      // Also abort the underlying fetch request so the backend sees the disconnect
      const service = chatServices.get(conversationId)
      if (service) {
        service.abort()
      }
    })

    // Update all streaming states
    const newConversations = new Map(conversations)
    newConversations.forEach((conv) => {
      if (conv.isStreaming) {
        conv.isStreaming = false
        conv.streamController = null
      }
    })

    set({ conversations: newConversations })
  },

  // Permission handling
  // Pure state setter: marks the permission-prompt message as responded.
  // The actual API call is owned by the component via
  // `useSendPermissionResponse` (workspace VM-scoped hook).
  markPermissionResponded: (conversationId, requestId, allowed, reason) => {
    const conversation = get().conversations.get(conversationId)
    if (!conversation) return

    const messages = conversation.messages.map((msg) => {
      if (
        msg.variant?.type === 'permission' &&
        msg.variant.request?.requestId === requestId
      ) {
        return {
          ...msg,
          metadata: {
            ...msg.metadata,
            permissionResponse: { allowed, reason },
          },
        }
      }
      return msg
    })

    get().updateConversation(conversationId, { messages })
  },

  // Pure state setter: marks the ask-user-question message as answered.
  // The actual API call is owned by the component via
  // `useSendAskUserResponse` (workspace VM-scoped hook).
  markAskUserResponded: (conversationId, requestId, answers) => {
    const conversation = get().conversations.get(conversationId)
    if (!conversation) return

    const messages = conversation.messages.map((msg) => {
      if (
        msg.variant?.type === 'ask-user-question' &&
        msg.variant.request?.requestId === requestId
      ) {
        return {
          ...msg,
          metadata: {
            ...msg.metadata,
            askUserResponse: { answers },
          },
        }
      }
      return msg
    })

    get().updateConversation(conversationId, { messages })
  },

  // Internal state updates
  updateConversation: (conversationId, updates) => {
    const { conversations } = get()
    const conversation = conversations.get(conversationId)

    if (!conversation) {
      console.warn(
        '[ChatStore] Cannot update - conversation not found:',
        conversationId,
      )
      return
    }

    const updated = {
      ...conversation,
      ...updates,
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, updated),
    })
  },

  addMessage: (conversationId, message) => {
    const { conversations } = get()
    const conversation = conversations.get(conversationId)

    if (!conversation) {
      console.warn(
        '[ChatStore] Cannot add message - conversation not found:',
        conversationId,
      )
      return
    }

    const updated = {
      ...conversation,
      messages: [...conversation.messages, message],
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, updated),
    })
  },

  updateLastMessage: (conversationId, updates) => {
    const { conversations } = get()
    const conversation = conversations.get(conversationId)

    if (!conversation || conversation.messages.length === 0) {
      console.warn(
        '[ChatStore] Cannot update last message - no messages:',
        conversationId,
      )
      return
    }

    const messages = [...conversation.messages]
    const lastIndex = messages.length - 1
    messages[lastIndex] = {
      ...messages[lastIndex],
      ...updates,
    }

    const updated = {
      ...conversation,
      messages,
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, updated),
    })
  },

  addToolCall: (conversationId, toolCall) => {
    const { conversations } = get()
    const conversation = conversations.get(conversationId)

    if (!conversation) {
      console.warn(
        '[ChatStore] Cannot add tool call - conversation not found:',
        conversationId,
      )
      return
    }

    const updated = {
      ...conversation,
      activeToolCalls: [...conversation.activeToolCalls, toolCall],
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, updated),
    })
  },

  updateToolCall: (conversationId, toolId, updates) => {
    const { conversations } = get()
    const conversation = conversations.get(conversationId)

    if (!conversation) {
      console.warn(
        '[ChatStore] Cannot update tool call - conversation not found:',
        conversationId,
      )
      return
    }

    const toolCalls = conversation.activeToolCalls.map((tc) =>
      tc.id === toolId ? { ...tc, ...updates } : tc,
    )

    const updated = {
      ...conversation,
      activeToolCalls: toolCalls,
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, updated),
    })
  },

  addSystemEvent: (conversationId, event) => {
    const { conversations } = get()
    const conversation = conversations.get(conversationId)

    if (!conversation) {
      console.warn(
        '[ChatStore] Cannot add system event - conversation not found:',
        conversationId,
      )
      return
    }

    const updated = {
      ...conversation,
      systemEvents: [...conversation.systemEvents, event],
      lastUpdated: new Date(),
    }

    set({
      conversations: new Map(conversations).set(conversationId, updated),
    })
  },
}))

/**
 * Handle individual chat events from SSE stream
 */
/** Side-effect handlers for non-UI events (no switch needed) */
const sideEffectHandlers: Record<string, (event: ChatEvent) => void> = {
  billing_update: (event) => {
    const meta = event.metadata as
      | { remainingBalanceCents?: number }
      | undefined
    if (meta?.remainingBalanceCents != null) {
      updateBalanceFromEvent(meta.remainingBalanceCents)
    }
  },
}

async function handleChatEvent(
  event: ChatEvent,
  conversationId: string,
  getState: () => ChatStore,
  onAssistantMessage: (id: string, content: string) => void,
): Promise<void> {
  const sideEffect = sideEffectHandlers[event.type]
  if (sideEffect) {
    sideEffect(event)
    return
  }

  const state = getState()

  switch (event.type) {
    case 'assistant': {
      const isPartial = event.metadata?.partial ?? false
      const content = event.content || ''

      const conversation = state.conversations.get(conversationId)
      if (!conversation) return

      const lastMessage =
        conversation.messages[conversation.messages.length - 1]

      if (
        lastMessage &&
        lastMessage.role === 'assistant' &&
        lastMessage.isStreaming
      ) {
        // Update existing streaming message
        const updatedContent = isPartial
          ? lastMessage.content + content
          : content
        state.updateLastMessage(conversationId, {
          content: updatedContent,
        })
        onAssistantMessage(lastMessage.id, updatedContent)
      } else {
        // Create new assistant message
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const newMessage: StoreMessage = {
          id: messageId,
          role: 'assistant',
          content,
          timestamp: new Date(),
          isStreaming: true,
        }
        state.addMessage(conversationId, newMessage)
        onAssistantMessage(messageId, content)
      }
      break
    }

    case 'tool': {
      const toolName = event.tool?.name || 'unknown'
      const toolId = event.toolId || `tool_${Date.now()}`
      const action = event.action

      console.log('[ChatStore] Tool event received:', {
        toolName,
        toolId,
        action,
        conversationId,
      })

      if (action === 'start') {
        // Tool execution started
        const toolCall: ToolCall = {
          id: toolId,
          name: toolName,
          arguments: event.tool?.arguments,
          status: 'running',
          timestamp: new Date(),
        }
        getState().addToolCall(conversationId, toolCall)
        console.log('[ChatStore] Tool call added to store:', toolCall)
      } else if (action === 'result') {
        // Tool execution completed
        getState().updateToolCall(conversationId, toolId, {
          status: 'completed',
          result: event.metadata,
        })
        console.log('[ChatStore] Tool call updated to completed:', toolId)
      }
      break
    }

    case 'tool_use': {
      // Backend sends tool_use when a tool starts executing
      const toolName = event.tool?.name || 'unknown'
      const toolId = event.metadata?.toolId || `tool_${Date.now()}`
      const args =
        (event.tool as any)?.parameters || event.tool?.arguments || {}

      console.log('[ChatStore] Tool use event received:', {
        toolName,
        toolId,
        conversationId,
        fullEvent: event,
        args,
      })

      // Skip TodoWrite - it's handled separately as pinned execution plan
      if (toolName === 'TodoWrite') {
        break
      }

      // Format description based on tool type
      let description = ''
      if (toolName === 'Bash') {
        description = args.command || 'Running command...'
      } else if (toolName === 'Read') {
        description = args.file_path || 'Reading file...'
      } else if (toolName === 'Write') {
        description = args.file_path || 'Writing file...'
      } else if (toolName === 'Edit' || toolName === 'MultiEdit') {
        description = args.file_path || 'Editing file...'
      } else if (toolName === 'Glob') {
        description = args.pattern || 'Searching files...'
      } else if (toolName === 'Grep') {
        description = args.pattern || 'Searching content...'
      } else {
        const filteredArgs = { ...args }
        delete filteredArgs._toolId
        description =
          Object.keys(filteredArgs).length > 0
            ? JSON.stringify(filteredArgs).substring(0, 100)
            : 'Processing...'
      }

      // Create a persistent message for the tool call
      const toolMessage: StoreMessage = {
        id: `tool_msg_${toolId}`,
        role: 'assistant',
        timestamp: new Date(),
        variant: {
          type: 'background-action',
          title: toolName,
          status: 'executing',
          description,
          expandable: false,
        },
        metadata: {
          toolId,
        },
      }

      getState().addMessage(conversationId, toolMessage)
      console.log(
        '[ChatStore] Tool message added to conversation:',
        toolMessage,
      )
      break
    }

    case 'tool_result': {
      // Backend sends tool_result when a tool completes
      const toolId = event.metadata?.toolId || 'Unknown'

      console.log('[ChatStore] Tool result event received:', {
        toolId,
        conversationId,
        fullEvent: event,
        content: event.content,
        metadata: event.metadata,
      })

      // Find and update the tool message to show completion
      const state = getState()
      const conversation = state.conversations.get(conversationId)
      if (!conversation) break

      const messages = [...conversation.messages]
      const toolMsgIndex = messages.findIndex(
        (msg) => msg.metadata?.toolId === toolId,
      )

      if (toolMsgIndex !== -1) {
        const toolMsg = messages[toolMsgIndex]
        messages[toolMsgIndex] = {
          ...toolMsg,
          variant: {
            ...toolMsg.variant,
            status: 'success',
            expandable: true,
            details:
              typeof event.content === 'string'
                ? event.content
                : JSON.stringify(event.content || event.metadata, null, 2),
          },
        }

        state.updateConversation(conversationId, {
          messages,
        })
        console.log('[ChatStore] Tool message updated to success')
      }
      break
    }

    case 'conversation_info': {
      const info = event.metadata
      if (info?.conversationId && info?.sessionId) {
        const realId = info.conversationId
        if (realId !== conversationId) {
          // The streaming used a placeholder (e.g. temp_xxx) — migrate the
          // conversation entry to the real id so messages already added during
          // streaming stay visible after the tab is re-linked.
          const state = getState()
          const existing = state.conversations.get(conversationId)
          if (existing && !state.conversations.has(realId)) {
            const migrated: ConversationState = {
              ...existing,
              conversationId: realId,
              sessionId: info.sessionId,
            }
            const next = new Map(state.conversations)
            next.delete(conversationId)
            next.set(realId, migrated)
            useChatStore.setState({ conversations: next })
            console.log(
              '[ChatStore] Migrated conversation from',
              conversationId,
              '->',
              realId,
            )
          } else {
            getState().updateConversation(realId, { sessionId: info.sessionId })
          }
        } else {
          getState().updateConversation(conversationId, {
            sessionId: info.sessionId,
          })
        }

        // Call event handler so the tab gets re-linked to the real id
        getState().eventHandlers.onConversationCreated?.(
          info.conversationId,
          info.sessionId,
          info.title || 'New Chat',
        )
      }
      break
    }

    case 'permission_request': {
      // Backend sends flat structure with requestId, toolName, etc. at top level
      if (event.requestId && event.toolName) {
        console.log('[ChatStore] Permission request received:', {
          requestId: event.requestId,
          toolName: event.toolName,
          riskLevel: event.riskLevel,
        })

        // Create a permission message to display in the chat
        const permissionMessage: StoreMessage = {
          id: `perm_${event.requestId}`,
          role: 'permission',
          timestamp: new Date(event.timestamp || Date.now()),
          variant: {
            type: 'permission',
            request: {
              requestId: event.requestId,
              sessionId:
                event.sessionId ||
                getState().conversations.get(conversationId)?.sessionId ||
                '',
              toolName: event.toolName,
              toolUseId: event.toolUseId,
              parameters: event.parameters,
              riskLevel:
                (event.riskLevel as 'low' | 'medium' | 'high' | 'critical') ||
                'medium',
              riskDisplay: event.riskDisplay || '🟡 MEDIUM',
              description:
                event.description ||
                `Permission required for ${event.toolName}`,
              factors: event.factors || [],
              timestamp: event.timestamp || new Date().toISOString(),
            },
          },
        }

        getState().addMessage(conversationId, permissionMessage)

        // Also call the event handler if set
        getState().eventHandlers.onPermissionRequest?.(
          conversationId,
          permissionMessage.variant.request,
        )
      }
      break
    }

    case 'ask_user_question': {
      // Backend sends ask_user_question with requestId, sessionId, and questions in metadata
      if (event.requestId && event.metadata?.questions) {
        console.log('[ChatStore] Ask-user question received:', {
          requestId: event.requestId,
          questions: event.metadata.questions,
        })

        const askUserMessage: StoreMessage = {
          id: `ask_${event.requestId}`,
          role: 'permission',
          timestamp: new Date(event.timestamp || Date.now()),
          variant: {
            type: 'ask-user-question',
            request: {
              requestId: event.requestId,
              sessionId:
                event.sessionId ||
                getState().conversations.get(conversationId)?.sessionId ||
                '',
              questions: event.metadata.questions,
              timestamp: event.timestamp || new Date().toISOString(),
            },
          },
        }

        getState().addMessage(conversationId, askUserMessage)
      }
      break
    }

    case 'error': {
      const errorMsg = event.error || event.content || 'Unknown error'
      getState().updateConversation(conversationId, {
        error: errorMsg,
        isStreaming: false,
      })

      // Add the error as a visible assistant message so the user sees it in chat
      const errorMessage: StoreMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
        metadata: event.metadata,
      }
      getState().addMessage(conversationId, errorMessage)

      getState().eventHandlers.onError?.(conversationId, errorMsg)
      break
    }

    case 'thinking':
    case 'planning':
    case 'progress':
    case 'status':
    case 'memory': {
      const systemEvent: SystemEvent = {
        type: event.type as any,
        content: event.content || '',
        metadata: event.metadata,
        timestamp: new Date(),
      }
      getState().addSystemEvent(conversationId, systemEvent)
      break
    }

    case 'done': {
      // Check if this is an error done event
      if (event.metadata?.error || event.content === 'Chat failed') {
        const errorMsg = event.content || 'Stream failed'
        console.error('[ChatStore] Stream failed:', errorMsg)
        getState().updateConversation(conversationId, {
          error: errorMsg,
          isStreaming: false,
        })
        getState().eventHandlers.onError?.(conversationId, errorMsg)
      } else {
        // Stream completed successfully
        getState().updateConversation(conversationId, {
          isStreaming: false,
        })
      }
      break
    }
  }
}
