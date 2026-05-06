import { useAuthPostLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { Workspace } from './types'

// The orchestrator returns the workspace directly as the response body;
// older code returned it wrapped as { workspace: { ... } }. Accept both.
type CreateWorkspaceResponse = Workspace | { workspace: Workspace }

export const useCreateWorkspace = () => {
  const [create, { data, loading, error }] =
    useAuthPostLazarusApi<CreateWorkspaceResponse>({
      path: '/api/workspaces',
    })

  const createWorkspace = async (
    name?: string,
    templateId?: string,
  ): Promise<string | null> => {
    try {
      const workspaceName = name || `Workspace ${Date.now()}`
      const slug = `workspace-${Date.now()}`

      const result = await create({
        name: workspaceName,
        slug,
        templateId: templateId || 'default',
      })
      const workspace =
        result && 'workspace' in result
          ? result.workspace
          : (result as Workspace | undefined)
      return workspace?.id || null
    } catch (error) {
      console.error(`[ERROR] Workspace creation exception:`, error)
      return null
    }
  }

  return [createWorkspace, { data, loading, error }] as const
}
