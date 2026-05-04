import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { Workspace } from '@/model/workspace'
import { useStoreEssentials } from '@/state/store'
import { objectToSnakeCase } from '@/utils/case-utils'

export const useUpdateWorkspace = () => {
  const { activeWorkspaceId } = useStoreEssentials()

  return useSupabaseMutation<Workspace, Partial<Workspace>>(
    async (supabase, updates) =>
      await supabase
        .from('workspaces')
        .update(objectToSnakeCase(updates))
        .eq('id', activeWorkspaceId)
        .select()
        .single(),
    {
      table: 'workspaces',
      operation: 'update',
    },
  )
}
