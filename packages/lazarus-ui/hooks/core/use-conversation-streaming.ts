import { useCallback } from 'react'

import { SystemEvent, ToolCall, useChatStore } from '@/store/chat-store'

/**
 * Hook to get streaming state of a conversation
 * Only re-renders when streaming state changes
 */
export function useIsStreaming(conversationId: string | null): boolean {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return false
        const conversation = state.conversations.get(conversationId)
        return conversation?.isStreaming || false
      },
      [conversationId],
    ),
  )
}

/**
 * Hook to get active tool calls
 */
export function useActiveToolCalls(conversationId: string | null): ToolCall[] {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return []
        const conversation = state.conversations.get(conversationId)
        return conversation?.activeToolCalls || []
      },
      [conversationId],
    ),
  )
}

/**
 * Hook to get system events
 */
export function useSystemEvents(conversationId: string | null): SystemEvent[] {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return []
        const conversation = state.conversations.get(conversationId)
        return conversation?.systemEvents || []
      },
      [conversationId],
    ),
  )
}

/**
 * Hook to get error state
 */
export function useConversationError(
  conversationId: string | null,
): string | null {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return null
        const conversation = state.conversations.get(conversationId)
        return conversation?.error || null
      },
      [conversationId],
    ),
  )
}

/**
 * Hook to get session ID
 */
export function useSessionId(conversationId: string | null): string | null {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return null
        const conversation = state.conversations.get(conversationId)
        return conversation?.sessionId || null
      },
      [conversationId],
    ),
  )
}
