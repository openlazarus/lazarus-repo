import { useItems } from '@/hooks/core/use-items'
import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { useStoreEssentials } from '@/state/store'

interface DeleteFileMutationVariables {
  fileId: string
}

/**
 * Hook to delete a file
 */
export const useDeleteFile = () => {
  const { activeWorkspaceId } = useStoreEssentials()
  const { deleteItem } = useItems('file')

  return useSupabaseMutation<any, DeleteFileMutationVariables>(
    async (supabase, variables) => {
      const { fileId } = variables
      const { data, error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .select()
        .single()

      return { data, error }
    },
    {
      table: 'files',
      operation: 'delete',
      syncToRepository: true,
      itemType: 'file',
      onSuccess: async (data, variables) => {
        // Remove from store after successful database deletion
        await deleteItem(variables.fileId)
      },
    },
  )
}
