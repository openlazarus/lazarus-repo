import { useCallback } from 'react'

import { useWebSocket } from './use-websocket'

export type DocumentInfo = {
  tab_id: string
  content: string
  metadata?: Record<string, any>
  scroll_to_line?: number
}

export type DocumentUpdate = {
  tab_id: string
  content: string
  cursor_position: number
}

export type DocumentSave = {
  tab_id: string
  path: string
}

export type UseDocumentSocketProps = {
  onNewInfo?: (info: DocumentInfo) => void
  onStatusChange?: (
    status: 'disconnected' | 'connecting' | 'connected' | 'error',
  ) => void
  onError?: (error: string) => void
  autoConnect?: boolean
}

export const useDocumentSocket = ({
  onNewInfo,
  onStatusChange,
  onError,
  autoConnect = true,
}: UseDocumentSocketProps = {}) => {
  const { status, error, connect, disconnect, sendMessage } = useWebSocket({
    messageHandlers: {
      new_info_for_tab: (data: DocumentInfo) => {
        onNewInfo?.(data)
      },
    },
    onStatusChange,
    onError,
    autoConnect,
  })

  const sendDocumentUpdate = useCallback(
    (update: DocumentUpdate) => {
      sendMessage('document_updated', update)
    },
    [sendMessage],
  )

  const sendDocumentSave = useCallback(
    (save: DocumentSave) => {
      sendMessage('document_saved', save)
    },
    [sendMessage],
  )

  return {
    status,
    error,
    connect,
    disconnect,
    sendDocumentUpdate,
    sendDocumentSave,
  }
}
