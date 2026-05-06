import { useWorkspace } from '@/hooks/core/use-workspace'
import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface ReconnectResult {
  success: boolean
  killed: number
  message: string
}

export const useReconnectServer = (serverName: string) => {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [call, { data, loading, error }] =
    useAuthPostWorkspaceApi<ReconnectResult>({
      path: `/api/workspaces/mcp/servers/${encodeURIComponent(serverName)}/restart`,
      params: workspaceId ? { workspaceId } : {},
    })

  const reconnect = async (): Promise<ReconnectResult | undefined> => {
    if (!workspaceId) return
    return call(undefined as never)
  }

  return [reconnect, { data, loading, error }] as const
}

export const useReconnectAllServers = () => {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [call, { data, loading, error }] =
    useAuthPostWorkspaceApi<ReconnectResult>({
      path: `/api/workspaces/mcp/restart`,
      params: workspaceId ? { workspaceId } : {},
    })

  const reconnectAll = async (): Promise<ReconnectResult | undefined> => {
    if (!workspaceId) return
    return call(undefined as never)
  }

  return [reconnectAll, { data, loading, error }] as const
}
