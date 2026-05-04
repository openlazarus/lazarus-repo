'use client'

import { useEffect } from 'react'

import { useGetConversation } from '@/hooks/features/conversation/use-get-conversation'
import { useGetConversationMessages } from '@/hooks/features/conversation/use-get-conversation-messages'
import { useChatStore } from '@/store/chat-store'

interface ConversationLoaderProps {
  workspaceId: string
  conversationId: string
}

/**
 * Mounted by ChatView when an existing conversation becomes active.
 * Fetches metadata + messages from the workspace VM via atomic hooks
 * and pushes the result into the chat store. Renders nothing.
 *
 * Once the conversation has messages loaded in the store, this component
 * skips re-applying data (the SWR hooks may still revalidate but the store
 * already reflects the latest known state).
 */
export const ConversationLoader = ({
  workspaceId,
  conversationId,
}: ConversationLoaderProps) => {
  const ensureConversation = useChatStore((s) => s.ensureConversation)
  const applyConversationData = useChatStore((s) => s.applyConversationData)
  const existingMessageCount = useChatStore(
    (s) => s.conversations.get(conversationId)?.messages.length ?? 0,
  )

  const { data: convData, error: convError } = useGetConversation(
    workspaceId,
    conversationId,
  )
  const { data: msgData } = useGetConversationMessages(
    workspaceId,
    conversationId,
  )

  useEffect(() => {
    ensureConversation(conversationId)
  }, [conversationId, ensureConversation])

  useEffect(() => {
    if (existingMessageCount > 0) return
    if (!convData?.conversation) return
    applyConversationData(
      conversationId,
      convData.conversation,
      msgData?.messages ?? [],
    )
  }, [
    conversationId,
    convData,
    msgData,
    existingMessageCount,
    applyConversationData,
  ])

  useEffect(() => {
    if (convError) {
      console.warn(
        '[ConversationLoader] Error loading conversation:',
        convError,
      )
    }
  }, [convError])

  return null
}
