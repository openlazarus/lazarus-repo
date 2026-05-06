import { useWorkspace } from '@/hooks/core/use-workspace'
import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface ExecutionControlResult {
  success: boolean
}

export const useStopExecution = (executionId: string) => {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [call, { data, loading, error }] =
    useAuthPostWorkspaceApi<ExecutionControlResult>({
      path: `/api/workspaces/executions/${executionId}/stop`,
      params: workspaceId ? { workspaceId } : {},
    })

  const stop = async (): Promise<ExecutionControlResult | undefined> => {
    if (!workspaceId || !executionId) return
    return call(undefined as never)
  }

  return [stop, { data, loading, error }] as const
}

export const useStartExecution = (executionId: string) => {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [call, { data, loading, error }] =
    useAuthPostWorkspaceApi<ExecutionControlResult>({
      path: `/api/workspaces/executions/${executionId}/start`,
      params: workspaceId ? { workspaceId } : {},
    })

  const start = async (): Promise<ExecutionControlResult | undefined> => {
    if (!workspaceId || !executionId) return
    return call(undefined as never)
  }

  return [start, { data, loading, error }] as const
}
