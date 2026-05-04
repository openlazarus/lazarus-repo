import { useCallback, useState } from 'react'

// WebSocket Message Types
export type MessageType =
  | 'agent_created'
  | 'agent_updated'
  | 'agent_complete'
  | 'tool_progress'
  | 'tool_result'
  | 'start'
  | 'register_connection'
  | 'register_tool_call'

// Message Structure Types
export interface AgentMessage {
  type: 'status' | 'tool' | 'content'
  content: string
  timestamp: string
  toolName?: string
  status?: 'running' | 'completed' | 'error'
}

export type StreamingStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'error'
  | 'completed'

// Document Edit Result
export interface DocumentEditResult {
  status: 'success' | 'error'
  message: string
  original_content?: string
  edited_content?: string
  explanations?: string[]
}

// Streaming Hook Props
export interface UseWebSocketStreamProps {
  onMessage?: (message: AgentMessage) => void
  onStatusChange?: (status: StreamingStatus) => void
  onDocumentEdit?: (result: DocumentEditResult) => void
  onError?: (error: string) => void
}

/**
 * Hook for managing WebSocket connections for streaming document edits
 */
export function useWebSocketStream({
  onMessage,
  onStatusChange,
  onDocumentEdit,
  onError,
}: UseWebSocketStreamProps = {}) {
  // Connection state
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [agentId, setAgentId] = useState<string | null>(null)

  // Add a new message
  const addMessage = useCallback(
    (message: AgentMessage) => {
      setMessages((prev) => [...prev, message])
      onMessage?.(message)
    },
    [onMessage],
  )

  // Handle errors
  const handleError = useCallback(
    (errorMessage: string) => {
      onError?.(errorMessage)
    },
    [onError],
  )

  // Process WebSocket messages
  const handleStreamingMessage = useCallback(
    (message: any) => {
      const { type } = message

      // Agent creation
      if (type === 'agent_created') {
        const agentId = message.data?.agent_id
        if (agentId) {
          setAgentId(agentId)
          addMessage({
            type: 'status',
            content: `Agent created (ID: ${agentId.substring(0, 8)}...)`,
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Tool progress updates
      else if (type === 'tool_progress') {
        const toolName = message.tool_name || 'edit_document'
        const status = message.status || 'running'
        const messageText = message.message || 'Processing...'

        addMessage({
          type: 'tool',
          content: messageText,
          timestamp: new Date().toISOString(),
          toolName,
          status,
        })
      }

      // Tool results
      else if (type === 'tool_result') {
        const toolName = message.tool_name || 'edit_document'
        const status = message.status || 'completed'
        const result = message.result || {}

        if (result.status === 'success') {
          // Process document editing result
          const documentResult: DocumentEditResult = {
            status: 'success',
            message: result.message || 'Document edited successfully',
            original_content: result.original_content || '',
            edited_content: result.edited_content || '',
            explanations: result.explanations || [],
          }

          // Call handler with the result
          onDocumentEdit?.(documentResult)

          // Add success message
          addMessage({
            type: 'tool',
            content: `Completed: ${result.message || 'Document edited successfully'}`,
            timestamp: new Date().toISOString(),
            toolName,
            status: 'completed',
          })

          // Process explanations
          if (result.explanations && Array.isArray(result.explanations)) {
            result.explanations.forEach((explanation: string) => {
              if (explanation) {
                addMessage({
                  type: 'content',
                  content: explanation
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"'),
                  timestamp: new Date().toISOString(),
                })
              }
            })
          }
        } else if (result.status === 'error') {
          handleError(`Editing failed: ${result.message || 'Unknown error'}`)

          addMessage({
            type: 'tool',
            content: `Error: ${result.message || 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            toolName,
            status: 'error',
          })
        }
      }
    },
    [addMessage, handleError, onDocumentEdit],
  )

  /* Temporarily commented out to fix infinite update loop
  // Use the base WebSocket hook
  const { status, error, connect, disconnect, sendMessage, webSocket } =
    useWebSocket({
      messageHandlers: {
        agent_created: handleStreamingMessage,
        agent_updated: handleStreamingMessage,
        agent_complete: handleStreamingMessage,
        tool_progress: handleStreamingMessage,
        tool_result: handleStreamingMessage,
      },
      onStatusChange: (newStatus) => {
        onStatusChange?.(newStatus as StreamingStatus)
      },
      onError: handleError,
      autoConnect: true,
    })
  */

  // Create stub implementations
  const status: StreamingStatus = 'disconnected'
  const error = null
  const connect = () => console.log('WebSocket streaming temporarily disabled')
  const disconnect = () =>
    console.log('WebSocket streaming temporarily disabled')
  const sendMessage = () => false
  const webSocket = null

  // Start a document edit session
  const startDocumentEdit = useCallback(
    (
      _workspaceId: string,
      _conversationId: string,
      _documentId: string,
      _instructions: string,
    ) => {
      console.log('WebSocket streaming temporarily disabled')
      return false

      /* Original implementation commented out
      if (status !== 'connected') {
        connect()
      }

      // Wait for connection to be established
      const checkAndSend = () => {
        if (webSocket?.readyState === WebSocket.OPEN) {
          onStatusChange?.('streaming')

          // Send start message
          const startMessage = {
            name: 'Document Editing Agent',
            instructions:
              'You are a helpful assistant that can edit documents. When asked to edit a document, use the edit_document tool to apply changes. Provide detailed progress updates to the user.',
            input: `I need to edit the document with ID ${documentId}. Please make these changes:\n${instructions}\n\nMake sure to explain each step as you're editing.`,
            workspace_id: workspaceId,
            conversation_id: conversationId,
            tools: ['edit_document'],
          }

          // Send the message
          return sendMessage('start', startMessage)
        } else if (webSocket?.readyState === WebSocket.CONNECTING) {
          // Still connecting, wait and try again
          setTimeout(checkAndSend, 500)
        } else {
          // Connection failed
          handleError('Failed to establish WebSocket connection')
          return false
        }
      }

      return checkAndSend()
      */
    },
    [],
  )

  // Register a tool call to receive updates about it
  const registerToolCall = useCallback(
    (toolCallId: string, toolName: string) => {
      console.log('WebSocket streaming temporarily disabled', {
        toolCallId,
        toolName,
      })
      return false

      /* Original implementation commented out
      if (!webSocket || webSocket.readyState !== WebSocket.OPEN) {
        return false
      }

      return sendMessage('register_tool_call', {
        tool_call_id: toolCallId,
        tool_name: toolName,
      })
      */
    },
    [],
  )

  return {
    // State
    status,
    error,
    messages,
    agentId,

    // Actions
    connect,
    disconnect,
    sendMessage,
    startDocumentEdit,
    registerToolCall,

    // WebSocket reference (for advanced usage)
    webSocket,
  }
}
