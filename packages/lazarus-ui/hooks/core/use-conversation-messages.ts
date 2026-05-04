import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { StoreMessage, ToolCall, useChatStore } from '@/store/chat-store'

/**
 * Optimized hook to get only messages from a conversation
 * Only re-renders when the messages array changes
 */
export function useConversationMessages(
  conversationId: string | null,
): StoreMessage[] {
  return useChatStore(
    useShallow(
      useCallback(
        (state) => {
          if (!conversationId) return []
          const conversation = state.conversations.get(conversationId)
          return conversation?.messages || []
        },
        [conversationId],
      ),
    ),
  )
}

/**
 * Hook to get the last message from a conversation
 */
export function useLastMessage(
  conversationId: string | null,
): StoreMessage | null {
  return useChatStore(
    useShallow(
      useCallback(
        (state) => {
          if (!conversationId) return null
          const conversation = state.conversations.get(conversationId)
          const messages = conversation?.messages || []
          return messages.length > 0 ? messages[messages.length - 1] : null
        },
        [conversationId],
      ),
    ),
  )
}

/**
 * Hook to get message count
 */
export function useMessageCount(conversationId: string | null): number {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return 0
        const conversation = state.conversations.get(conversationId)
        return conversation?.messages.length || 0
      },
      [conversationId],
    ),
  )
}

/**
 * Hook to get active tool calls for a conversation
 */
export function useActiveToolCalls(conversationId: string | null): ToolCall[] {
  return useChatStore(
    useShallow(
      useCallback(
        (state) => {
          if (!conversationId) return []
          const conversation = state.conversations.get(conversationId)
          return conversation?.activeToolCalls || []
        },
        [conversationId],
      ),
    ),
  )
}
