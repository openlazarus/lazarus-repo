import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import {
  getTeamIdFromContext,
  getWorkspaceIdFromContext,
} from '@/lib/api-client'
import { createClient } from '@/utils/supabase/client'

export type ChatEventType =
  | 'assistant'
  | 'message' // Alias for assistant message (from some backends)
  | 'tool' // Tool events with action: start/result
  | 'tool_use' // Tool started executing
  | 'tool_result' // Tool completed executing
  | 'error'
  | 'done'
  | 'complete' // Stream completion event
  | 'init' // Initialization event
  | 'result'
  | 'context'
  | 'memory'
  | 'permission_request'
  | 'permission_resolved'
  | 'permission_timeout'
  | 'thinking'
  | 'planning'
  | 'progress'
  | 'status'
  | 'conversation_info'
  | 'user'
  | 'ask_user_question'
  | 'ask_user_question_resolved'
  | 'unknown'

export interface ChatEvent {
  type: ChatEventType
  content?: string
  tool?: {
    name: string
    arguments?: any
  }
  action?: string // For tool events: 'start' | 'result'
  toolId?: string // Tool invocation ID
  metadata?: {
    partial?: boolean
    [key: string]: any
  }
  error?: string
  timestamp?: string
  // Permission request fields (flat structure from backend)
  requestId?: string
  sessionId?: string
  toolName?: string
  toolUseId?: string
  parameters?: any
  riskLevel?: string
  riskDisplay?: string
  description?: string
  factors?: string[]
  allowed?: boolean
  message?: string
  // Legacy nested structure (deprecated)
  permissionRequest?: {
    permissionId: string
    toolName: string
    operation: string
    parameters: any
    reason: string
  }
}

export interface ChatRequestOptions {
  message: string
  workspaceId?: string
  agentId?: string
  mcpServers?: string[]
  systemPrompt?: string
  maxTurns?: number
  temperature?: number
  streamResponse?: boolean
  requirePermissions?: boolean
  resumeSessionId?: string
}

export interface ChatStreamCallbacks {
  onAssistantMessage?: (content: string, isPartial: boolean) => void
  onToolUse?: (toolName: string, args?: any) => void
  onToolResult?: (result: any) => void // Now receives object with result and toolId
  onError?: (error: string) => void
  onDone?: () => void
  onContext?: (context: any) => void
  onPermissionRequest?: (request: PermissionRequest) => void
  onConversationInfo?: (info: {
    conversationId: string
    sessionId: string
    title: string
  }) => void
  onMemory?: (content: string, metadata?: any) => void
  onThinking?: (content: string) => void
  onPlanning?: (content: string) => void
  onProgress?: (content: string, metadata?: any) => void
  onStatus?: (content: string, metadata?: any) => void
  onAskUserQuestion?: (request: {
    requestId: string
    sessionId: string
    questions: Array<{
      question: string
      header: string
      options: Array<{ label: string; description: string }>
      multiSelect: boolean
    }>
    timestamp: string
  }) => void
}

export interface PermissionRequest {
  permissionId: string
  toolName: string
  operation: string
  parameters: any
  reason: string
}

export interface PermissionResponse {
  sessionId: string
  requestId: string
  approved: boolean
  reason?: string
}

export class ChatAPIService {
  private abortController: AbortController | null = null

  // Session ID captured from conversation_info events (auto-set by backend)
  private sessionId: string | null = null

  // Explicit resume session ID set when loading a conversation (takes priority)
  private resumeSessionId: string | null = null

  constructor() {
    // No longer needs baseUrl or userId - API client handles auth automatically
  }

  /**
   * Get headers with JWT token for streaming requests.
   * NOTE: Streaming endpoint must use fetch (not axios) for SSE support.
   * Non-streaming endpoints use the api client for consistency.
   */
  private async getAuthHeaders(workspaceId?: string): Promise<HeadersInit> {
    const supabase = createClient()

    // Get session with error handling
    let session
    try {
      const result = await supabase.auth.getSession()
      if (result.error) {
        console.error('[ChatAPIService] Supabase auth error:', result.error)
      }
      session = result.data.session
    } catch (error) {
      console.error('[ChatAPIService] Failed to get Supabase session:', error)
      throw new Error('Failed to retrieve authentication session')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    } else {
      console.warn(
        '[ChatAPIService] No access token available - session may be expired or user not logged in',
      )
    }

    // Use workspace from context if not provided
    const wsId = workspaceId || getWorkspaceIdFromContext()
    if (wsId) {
      headers['x-workspace-id'] = wsId
    }

    const teamId = getTeamIdFromContext()
    if (teamId) {
      headers['x-team-id'] = teamId
    }

    return headers
  }

  async *streamChat(
    options: ChatRequestOptions,
  ): AsyncGenerator<ChatEvent, void, unknown> {
    // Abort any existing request
    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      // Determine which session ID to use for resuming
      // Priority: explicit resumeSessionId > stored resumeSessionId > stored sessionId
      const resumeId =
        this.resumeSessionId || options.resumeSessionId || this.sessionId

      const requestBody: any = {
        ...options,
        streamResponse: true,
      }

      // Only include resumeSessionId if we actually have one
      // This prevents resuming when starting a new conversation after clearSession()
      if (resumeId) {
        requestBody.resumeSessionId = resumeId
        console.log(
          '[ChatAPIService] Resuming conversation with sessionId:',
          resumeId,
        )
      } else {
        console.log('[ChatAPIService] Starting new conversation (no resume)')
      }

      const baseUrl = getWorkspaceBaseUrl(options.workspaceId)

      // Get auth headers with error handling
      let headers: HeadersInit
      try {
        headers = await this.getAuthHeaders(options.workspaceId)
        console.log('[ChatAPIService] Auth headers obtained:', {
          hasAuth: !!(headers as Record<string, string>)['Authorization'],
          hasWorkspace: !!(headers as Record<string, string>)['x-workspace-id'],
        })
      } catch (authError) {
        console.error('[ChatAPIService] Failed to get auth headers:', authError)
        yield {
          type: 'error',
          error: `Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`,
        }
        return
      }

      // Validate we have authentication before making the request
      if (!(headers as Record<string, string>)['Authorization']) {
        console.warn(
          '[ChatAPIService] No auth token available - user may not be logged in',
        )
        yield {
          type: 'error',
          error: 'Not authenticated. Please sign in and try again.',
        }
        return
      }

      const url = `${baseUrl}/api/chat/stream`
      console.log('[ChatAPIService] Making request to:', url)
      console.log(
        '[ChatAPIService] Request body:',
        JSON.stringify(requestBody).substring(0, 200),
      )

      let response: Response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: this.abortController.signal,
        })
      } catch (fetchError: any) {
        console.error('[ChatAPIService] Fetch threw an error:', {
          name: fetchError.name,
          message: fetchError.message,
          url,
          headerKeys: Object.keys(headers),
        })
        throw fetchError
      }

      // Clear explicit resumeSessionId after using it once
      if (this.resumeSessionId) {
        console.log(
          '[ChatAPIService] Cleared explicit resumeSessionId after use',
        )
        this.resumeSessionId = null
      }

      if (!response.ok) {
        // Try to get error message from response body
        let errorDetail = response.statusText
        try {
          const errorBody = await response.json()
          errorDetail =
            errorBody.error || errorBody.message || response.statusText
        } catch {
          // Ignore JSON parse errors, use statusText
        }

        // Provide user-friendly error messages based on status
        if (response.status === 401) {
          throw new Error(
            'Authentication required. Please sign in and try again.',
          )
        } else if (response.status === 403) {
          throw new Error(
            'Access denied. You may not have permission to perform this action.',
          )
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`Request failed (${response.status}): ${errorDetail}`)
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()

            if (data === '[DONE]') {
              yield { type: 'done' }
              return
            }

            try {
              const event = JSON.parse(data)
              console.log('[ChatAPI] Parsed event:', event)
              yield event as ChatEvent
            } catch (e) {
              console.error('Failed to parse event:', data, e)
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.slice(6).trim()
        if (data && data !== '[DONE]') {
          try {
            const event = JSON.parse(data)
            console.log('[ChatAPI] Parsed final event:', event)
            yield event as ChatEvent
          } catch (e) {
            console.error('Failed to parse final event:', data, e)
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[ChatAPIService] Request aborted')
      } else {
        // Provide more helpful error messages for common network issues
        let errorMessage = error.message || 'Unknown error occurred'

        // Check for common network error patterns
        if (
          error.name === 'TypeError' &&
          (errorMessage.includes('fetch') ||
            errorMessage === 'network error' ||
            errorMessage === 'Failed to fetch')
        ) {
          errorMessage =
            'Network error: Unable to connect to the server. Please check your internet connection and try again.'
          console.error(
            '[ChatAPIService] Network error - possible causes: server down, CORS issue, or network connectivity',
          )
        } else if (
          errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized')
        ) {
          errorMessage =
            'Session expired. Please refresh the page and sign in again.'
        }

        console.error('[ChatAPIService] Stream error:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        })

        yield {
          type: 'error',
          error: errorMessage,
        }
      }
    } finally {
      this.abortController = null
    }
  }

  async sendChatMessage(
    options: ChatRequestOptions,
    callbacks: ChatStreamCallbacks,
  ): Promise<void> {
    console.log('[ChatAPI] Starting sendChatMessage with options:', options)

    for await (const event of this.streamChat(options)) {
      console.log('[ChatAPI] Received event:', event)

      switch (event.type) {
        case 'assistant':
        case 'message': // Handle both 'assistant' and 'message' types
          // Check if it's an assistant message (for 'message' type events)
          if (event.type === 'message' && (event as any).role !== 'assistant') {
            break // Skip non-assistant message events
          }

          if (event.content) {
            console.log(
              '[ChatAPI] Assistant event - content:',
              event.content,
              'partial:',
              event.metadata?.partial || (event as any).partial,
            )
            // Pass through each chunk as-is - frontend creates separate bubbles
            const isPartial = event.metadata?.partial || (event as any).partial
            console.log('[ChatAPI] Passing through chunk:', event.content)
            callbacks.onAssistantMessage?.(event.content, isPartial || false)
          }
          break

        case 'tool':
          // Handle tool events (start/result)
          console.log('[ChatAPI] Tool event:', event)
          const toolEvent = event as any
          if (toolEvent.action === 'start') {
            // Pass both tool name and parameters
            callbacks.onToolUse?.(toolEvent.tool || 'Unknown', {
              ...toolEvent.parameters,
              _toolId: toolEvent.toolId, // Include toolId for tracking
            })
          } else if (toolEvent.action === 'result') {
            // Include toolId with result
            callbacks.onToolResult?.({
              result: toolEvent.result || toolEvent.content,
              toolId: toolEvent.toolId,
            })
          }
          break

        case 'tool_use':
          // Handle tool use events from new backend format
          console.log('[ChatAPI] Tool use event:', event)
          const toolUseEvent = event as any
          callbacks.onToolUse?.(toolUseEvent.tool?.name || 'Unknown', {
            ...toolUseEvent.tool?.parameters,
            _toolId: toolUseEvent.metadata?.toolId,
          })
          break

        case 'tool_result':
          // Handle tool result events from new backend format
          console.log('[ChatAPI] Tool result event:', event)
          const toolResultEvent = event as any
          callbacks.onToolResult?.({
            result: toolResultEvent.content,
            toolId: toolResultEvent.metadata?.toolId,
          })
          break

        case 'error':
          callbacks.onError?.(event.error || event.content || 'Unknown error')
          break

        case 'done':
          console.log('[ChatAPI] Done event:', event.content)
          callbacks.onDone?.()
          break

        case 'complete':
          // Complete event contains the full message summary
          console.log('[ChatAPI] Complete event:', (event as any).summary)
          // Don't reset assistantMessage here - it's already been accumulated
          // Just signal completion
          callbacks.onDone?.()
          break

        case 'result':
          console.log('[ChatAPI] Result event:', event.content)
          // DON'T extract session ID automatically - it causes context leaks
          // Session ID should only be set explicitly via setResumeSessionId when loading conversations
          break

        case 'context':
          console.log('[ChatAPI] Context event:', event.metadata)
          callbacks.onContext?.(event.metadata)
          break

        case 'memory':
          console.log(
            '[ChatAPI] Memory event:',
            event.content || (event as any).message,
          )
          const memoryContent = event.content || (event as any).message || ''
          callbacks.onMemory?.(memoryContent, event.metadata || event)
          break

        case 'permission_request':
          console.log('[ChatAPI] Permission request:', event.permissionRequest)
          if (event.permissionRequest) {
            callbacks.onPermissionRequest?.(event.permissionRequest)
          }
          break

        case 'ask_user_question':
          console.log('[ChatAPI] Ask user question:', event)
          if (event.requestId && event.metadata?.questions) {
            callbacks.onAskUserQuestion?.({
              requestId: event.requestId,
              sessionId: event.sessionId || '',
              questions: event.metadata.questions,
              timestamp: event.timestamp || new Date().toISOString(),
            })
          }
          break

        case 'thinking':
          console.log('[ChatAPI] Thinking event:', event.content)
          callbacks.onThinking?.(event.content || '')
          break

        case 'planning':
          console.log('[ChatAPI] Planning event:', event.content)
          callbacks.onPlanning?.(event.content || '')
          break

        case 'progress':
          console.log('[ChatAPI] Progress event:', event.content)
          callbacks.onProgress?.(event.content || '', event.metadata)
          break

        case 'status':
          console.log('[ChatAPI] Status event:', event.content)
          callbacks.onStatus?.(event.content || '', event.metadata)
          // NOTE: Session ID only captured from conversation_info events
          break

        case 'conversation_info':
          console.log('[ChatAPI] Conversation info event:', event.metadata)
          if (event.metadata) {
            callbacks.onConversationInfo?.({
              conversationId: event.metadata.conversationId,
              sessionId: event.metadata.sessionId,
              title: event.metadata.title,
            })
            // Store session ID
            if (event.metadata.sessionId) {
              this.sessionId = event.metadata.sessionId
            }
          }
          break

        case 'init':
          // Handle initialization event
          console.log('[ChatAPI] Init event:', event)
          const initEvent = event as any
          // NOTE: Session ID only captured from conversation_info events to avoid context leaks
          if (initEvent.context) {
            callbacks.onContext?.(initEvent.context)
          }
          break

        default:
          console.log('[ChatAPI] Unhandled event type:', event.type, event)
          break
      }
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Set session ID (typically auto-captured from conversation_info events)
   * Use setResumeSessionId() instead when explicitly loading a conversation
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
    console.log('[ChatAPIService] Session ID set:', sessionId)
  }

  /**
   * Get current session ID (auto-captured from backend)
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Set explicit resume session ID for loading a specific conversation
   * Takes priority over auto-captured sessionId
   * Cleared automatically after first use
   */
  setResumeSessionId(sessionId: string): void {
    this.resumeSessionId = sessionId
    console.log('[ChatAPIService] Resume session ID set (explicit):', sessionId)
  }

  /**
   * Get explicit resume session ID
   */
  getResumeSessionId(): string | null {
    return this.resumeSessionId
  }

  /**
   * Clear all session state - use when starting a new conversation
   * Ensures no accidental context leakage from previous chats
   */
  clearSession(): void {
    this.sessionId = null
    this.resumeSessionId = null
    console.log('[ChatAPIService] Session cleared - ready for new conversation')
  }
}
