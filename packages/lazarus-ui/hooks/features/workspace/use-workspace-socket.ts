import { useWebSocket } from '@/hooks/sockets/use-websocket'
import { getWorkspaceWssUrl } from '@/lib/websocket-utils'

export const useWorkspaceSocket = (
  workspaceId: string,
  handlers: Record<string, (data: any) => void>,
) => {
  const base = (() => {
    const override = process.env.NEXT_PUBLIC_WORKSPACE_API_URL
    if (override)
      return override.replace(/^https/, 'wss').replace(/^http/, 'ws')
    const baseDomain =
      process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN || 'localhost'
    return workspaceId
      ? `wss://${workspaceId}.${baseDomain}`
      : getWorkspaceWssUrl()
  })()

  return useWebSocket({
    url: `${base}/api/workspace/${workspaceId}/socket`,
    messageHandlers: handlers,
    autoConnect: !!workspaceId,
  })
}
