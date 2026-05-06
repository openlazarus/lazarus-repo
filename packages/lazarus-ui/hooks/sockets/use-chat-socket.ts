import { useCallback, useMemo, useState } from 'react'

import { useWebSocket } from './use-websocket'

export type MessageType =
  | 'user_message'
  | 'agent_message'
  | 'conversation_created'

export interface ChatMessage {
  type: MessageType
  id: string
  timestamp: string
  sender: 'user' | 'agent' | 'system'
  workspace_id?: string
  conversation_id?: string
  data: {
    content: string
    agent_id?: string
    is_final?: boolean
    token_usage?: {
      input_tokens: number
      output_tokens: number
      total_tokens: number
    }
    status?: string
    item_type?: string
  }
}

export interface UseChatSocketProps {
  onMessage?: (message: ChatMessage) => void
  onStatusChange?: (
    status: 'disconnected' | 'connecting' | 'connected' | 'error',
  ) => void
  onError?: (error: string) => void
  autoConnect?: boolean
  conversationId?: string
  workspaceId?: string
  initialMessages?: ChatMessage[]
}

export const useChatSocket = ({
  onMessage,
  onStatusChange,
  onError,
  autoConnect = true,
  conversationId,
  workspaceId,
  initialMessages = [],
}: UseChatSocketProps = {}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)

  const handleMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => [...prev, message])
      onMessage?.(message)
    },
    [onMessage],
  )

  const messageHandlers = useMemo(
    () => ({
      user_message: handleMessage,
      agent_message: handleMessage,
    }),
    [handleMessage],
  )

  const {
    status,
    error,
    connect,
    disconnect,
    sendMessage: sendWebSocketMessage,
  } = useWebSocket({
    messageHandlers,
    onStatusChange,
    onError,
    autoConnect,
  })

  const sendMessage = useCallback(
    (content: string) => {
      // if (!conversationId || !workspaceId) {
      //   onError?.('No active conversation')
      //   return false
      // }

      const message: ChatMessage = {
        type: 'user_message',
        id: `user-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sender: 'user',
        workspace_id: workspaceId,
        conversation_id: conversationId,
        data: {
          content,
        },
      }

      setMessages((prev) => [...prev, message])

      return sendWebSocketMessage('user_message', message)
    },
    [conversationId, workspaceId, sendWebSocketMessage, onError],
  )

  return {
    // State
    status,
    error,
    messages,

    // Actions
    connect,
    disconnect,
    sendMessage,
  }
}
