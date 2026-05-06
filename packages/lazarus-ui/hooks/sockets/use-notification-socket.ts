import { useCallback } from 'react'

import { useWebSocket } from './use-websocket'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface NotificationPayload {
  level: NotificationLevel
  message: string
  duration?: number
}

export interface UseNotificationSocketProps {
  onNotification?: (notification: NotificationPayload) => void
  autoConnect?: boolean
}

export const useNotificationSocket = ({
  onNotification,
  autoConnect = true,
}: UseNotificationSocketProps = {}) => {
  const handleNotification = useCallback(
    (data: NotificationPayload) => {
      onNotification?.(data)
    },
    [onNotification],
  )

  const { status, error, connect, disconnect } = useWebSocket({
    messageHandlers: {
      notification: handleNotification,
    },
    autoConnect,
  })

  return {
    status,
    error,
    connect,
    disconnect,
  }
}
