import { useEffect, useRef, useState } from 'react'

import { getWorkspaceWssUrl } from '@/lib/websocket-utils'

const MAX_RECONNECT_ATTEMPTS = 3

export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export type MessageHandler<T = any> = (data: T) => void

export type UseWebSocketProps = {
  url?: string
  messageHandlers: Record<string, MessageHandler>
  onStatusChange?: (status: WebSocketStatus) => void
  onError?: (error: string) => void
  autoConnect?: boolean
  headers?: Record<string, string>
}

// Singleton instance — supports multiple handlers per message type
class WebSocketManager {
  private static instance: WebSocketManager | null = null
  private ws: WebSocket | null = null
  private currentUrl: string = ''
  private status: WebSocketStatus = 'disconnected'
  private error: string | null = null
  private reconnectAttempts: number = 0
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map()
  private statusChangeHandlers: Set<(status: WebSocketStatus) => void> =
    new Set()
  private errorHandlers: Set<(error: string) => void> = new Set()

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  private updateStatus(newStatus: WebSocketStatus) {
    this.status = newStatus
    this.statusChangeHandlers.forEach((handler) => handler(newStatus))
  }

  private handleError(errorMessage: string) {
    this.error = errorMessage
    this.updateStatus('error')
    this.errorHandlers.forEach((handler) => handler(errorMessage))
  }

  connect(url: string = getWorkspaceWssUrl()) {
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) {
      // If the URL changed (e.g. workspace switch), disconnect and reconnect
      if (url !== this.currentUrl) {
        console.log(`WebSocket URL changed, reconnecting: ${url}`)
        this.disconnect()
      } else {
        console.log('WebSocket already connected/connecting, skipping')
        return
      }
    }

    try {
      console.log(`Connecting to WebSocket at ${url}...`)
      this.currentUrl = url
      this.updateStatus('connecting')

      const ws = new WebSocket(url)
      this.ws = ws

      ws.onopen = () => {
        console.log('Connected')
        this.updateStatus('connected')
        this.reconnectAttempts = 0
      }

      ws.onclose = (event) => {
        console.log(`Disconnected: code=${event.code}, reason=${event.reason}`)

        if (event.code === 1000) {
          this.updateStatus('disconnected')
        } else {
          if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(
              `Reconnecting (${this.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`,
            )
            this.reconnectAttempts++
            setTimeout(() => this.connect(this.currentUrl), 2000)
          } else {
            this.handleError(
              `WebSocket closed abnormally (code: ${event.code})`,
            )
          }
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.handleError('WebSocket connection error')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('Message:', message)

          const handlers = this.messageHandlers.get(message.type || '')
          if (handlers && handlers.size > 0) {
            const payload = message.data ?? message
            handlers.forEach((handler) => handler(payload))
          } else {
            console.warn(`No handler for message type: ${message.type}`)
          }
        } catch (error) {
          this.handleError('Invalid JSON received')
        }
      }
    } catch (error) {
      console.error('WebSocket init error:', error)
      this.handleError(
        `Init error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.updateStatus('disconnected')
    }
  }

  sendMessage(type: string, data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.handleError('WebSocket is not connected')
      return false
    }

    try {
      if (!type) {
        this.ws.send(JSON.stringify(data))
      } else {
        this.ws.send(
          JSON.stringify({
            type,
            data,
          }),
        )
      }
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      this.handleError(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  addMessageHandler(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler)
  }

  removeMessageHandler(type: string, handler: MessageHandler) {
    this.messageHandlers.get(type)?.delete(handler)
    if (this.messageHandlers.get(type)?.size === 0) {
      this.messageHandlers.delete(type)
    }
  }

  addStatusChangeHandler(handler: (status: WebSocketStatus) => void) {
    this.statusChangeHandlers.add(handler)
    return () => this.statusChangeHandlers.delete(handler)
  }

  addErrorHandler(handler: (error: string) => void) {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  getStatus(): WebSocketStatus {
    return this.status
  }

  getError(): string | null {
    return this.error
  }

  getWebSocket(): WebSocket | null {
    return this.ws
  }
}

export const useWebSocket = ({
  url = getWorkspaceWssUrl(),
  messageHandlers,
  onStatusChange,
  onError,
  autoConnect = true,
}: UseWebSocketProps) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const managerRef = useRef(WebSocketManager.getInstance())
  // Keep refs to the exact handlers we registered so cleanup removes only ours
  const registeredHandlersRef = useRef<Record<string, MessageHandler>>({})

  useEffect(() => {
    const manager = managerRef.current

    // Store and register handlers
    const handlersSnapshot = { ...messageHandlers }
    registeredHandlersRef.current = handlersSnapshot

    Object.entries(handlersSnapshot).forEach(([type, handler]) => {
      manager.addMessageHandler(type, handler)
    })

    // Add status change handler
    const removeStatusHandler = manager.addStatusChangeHandler((newStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    })

    // Add error handler
    const removeErrorHandler = manager.addErrorHandler((errorMessage) => {
      setError(errorMessage)
      onError?.(errorMessage)
    })

    if (autoConnect && url) {
      manager.connect(url)
    }

    return () => {
      // Remove only the specific handlers we registered
      Object.entries(registeredHandlersRef.current).forEach(
        ([type, handler]) => {
          manager.removeMessageHandler(type, handler)
        },
      )
      removeStatusHandler()
      removeErrorHandler()
    }
  }, [url, messageHandlers, autoConnect])

  return {
    status,
    error,
    connect: () => managerRef.current.connect(url),
    disconnect: () => managerRef.current.disconnect(),
    sendMessage: (type: string, data: any) =>
      managerRef.current.sendMessage(type, data),
    webSocket: managerRef.current.getWebSocket(),
  }
}
