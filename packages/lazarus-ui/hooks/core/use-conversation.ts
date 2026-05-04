'use client'

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useSendAskUserResponse } from '@/hooks/features/chat/use-send-ask-user-response'
import { useSendPermissionResponse } from '@/hooks/features/chat/use-send-permission-response'
import { ConversationState, useChatStore } from '@/store/chat-store'

/**
 * Hook to access a specific conversation's full state
 * Uses shallow equality to prevent unnecessary re-renders
 */
export function useConversation(
  conversationId: string | null,
): ConversationState | null {
  return useChatStore(
    useShallow((state) => {
      if (!conversationId) return null
      return state.conversations.get(conversationId) || null
    }),
  )
}

/**
 * Hook to get conversation actions.
 *
 * Composes the workspace VM API hooks (`useSendPermissionResponse`,
 * `useSendAskUserResponse`) with pure state setters from the chat store.
 * Each returned action does the API call first, then mutates store state.
 */
export function useConversationActions(workspaceId: string) {
  const createConversation = useChatStore((state) => state.createConversation)
  const deleteConversation = useChatStore((state) => state.deleteConversation)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const ensureConversation = useChatStore((state) => state.ensureConversation)
  const cancelStream = useChatStore((state) => state.cancelStream)
  const cancelAllStreams = useChatStore((state) => state.cancelAllStreams)
  const markPermissionResponded = useChatStore(
    (state) => state.markPermissionResponded,
  )
  const markAskUserResponded = useChatStore(
    (state) => state.markAskUserResponded,
  )

  const [sendPermission] = useSendPermissionResponse(workspaceId)
  const [sendAskUser] = useSendAskUserResponse(workspaceId)

  const sendPermissionResponse = useCallback(
    async (
      conversationId: string,
      sessionId: string,
      requestId: string,
      allowed: boolean,
      reason?: string,
    ) => {
      await sendPermission({
        sessionId,
        requestId,
        approved: allowed,
        reason,
      })
      markPermissionResponded(conversationId, requestId, allowed, reason)
    },
    [sendPermission, markPermissionResponded],
  )

  const sendAskUserQuestionResponse = useCallback(
    async (
      conversationId: string,
      sessionId: string,
      requestId: string,
      answers: Record<string, string>,
    ) => {
      await sendAskUser({ sessionId, requestId, answers })
      markAskUserResponded(conversationId, requestId, answers)
    },
    [sendAskUser, markAskUserResponded],
  )

  return {
    createConversation,
    deleteConversation,
    sendMessage,
    ensureConversation,
    cancelStream,
    cancelAllStreams,
    sendPermissionResponse,
    sendAskUserQuestionResponse,
  }
}

/**
 * Hook to check if a conversation exists
 */
export function useConversationExists(conversationId: string | null): boolean {
  return useChatStore(
    useCallback(
      (state) => {
        if (!conversationId) return false
        return state.conversations.has(conversationId)
      },
      [conversationId],
    ),
  )
}
