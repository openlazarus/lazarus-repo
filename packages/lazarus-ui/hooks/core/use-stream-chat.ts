'use client'

import { useCallback, useRef } from 'react'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import {
  getTeamIdFromContext,
  getWorkspaceIdFromContext,
} from '@/lib/api-client'
import type {
  ChatEvent,
  ChatRequestOptions,
  ChatStreamCallbacks,
} from '@/services/chat-api.service'
import { createClient } from '@/utils/supabase/client'

// Types re-used from service while it still exists; keep the service for the store
export type {
  ChatEvent,
  ChatRequestOptions,
  ChatStreamCallbacks,
} from '@/services/chat-api.service'

/**
 * Hook for SSE streaming chat. Uses fetch + ReadableStream internally since
 * SSE cannot be handled by axios/useAuthPostWorkspaceApi.
 * workspaceId is an explicit param per Rule 4.
 */
export function useStreamChat(workspaceId: string) {
  const abortControllerRef = useRef<AbortController | null>(null)

  const streamChat = useCallback(
    async (options: ChatRequestOptions, callbacks: ChatStreamCallbacks) => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const wsId = workspaceId || getWorkspaceIdFromContext() || ''
      const teamId = getTeamIdFromContext()
      const baseUrl = getWorkspaceBaseUrl(wsId)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (session?.access_token)
        headers['Authorization'] = `Bearer ${session.access_token}`
      if (wsId) headers['x-workspace-id'] = wsId
      if (teamId) headers['x-team-id'] = teamId

      const response = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...options, streamResponse: true }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok)
        throw new Error(`Chat stream failed: ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              callbacks.onDone?.()
              return
            }
            try {
              const event = JSON.parse(data) as ChatEvent
              // Delegate event dispatching to the same logic as ChatAPIService
              dispatchChatEvent(event, callbacks)
            } catch {
              /* ignore parse errors */
            }
          }
        }
      }
    },
    [workspaceId],
  )

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  return { streamChat, abort }
}

function dispatchChatEvent(event: ChatEvent, callbacks: ChatStreamCallbacks) {
  switch (event.type) {
    case 'assistant':
    case 'message':
      if (event.content) {
        const isPartial = event.metadata?.partial || (event as any).partial
        callbacks.onAssistantMessage?.(event.content, isPartial || false)
      }
      break
    case 'error':
      callbacks.onError?.(event.error || event.content || 'Unknown error')
      break
    case 'done':
    case 'complete':
      callbacks.onDone?.()
      break
    case 'context':
      callbacks.onContext?.(event.metadata)
      break
    case 'permission_request':
      if (event.permissionRequest)
        callbacks.onPermissionRequest?.(event.permissionRequest)
      break
    case 'ask_user_question':
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
      callbacks.onThinking?.(event.content || '')
      break
    case 'memory':
      callbacks.onMemory?.(
        (event.content || (event as any).message) ?? '',
        event.metadata || event,
      )
      break
    case 'conversation_info':
      if (event.metadata) {
        callbacks.onConversationInfo?.({
          conversationId: event.metadata.conversationId,
          sessionId: event.metadata.sessionId,
          title: event.metadata.title,
        })
      }
      break
    default:
      break
  }
}
