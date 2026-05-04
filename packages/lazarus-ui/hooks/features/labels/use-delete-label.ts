import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { useStore, useStoreEssentials } from '@/state/store'

interface DeleteLabelMutationVariables {
  labelId: string
}

export function useDeleteLabel() {
  const { activeWorkspaceId } = useStoreEssentials()
  const { setLabels } = useStore()

  const [mutate, state] = useSupabaseMutation<
    any,
    DeleteLabelMutationVariables
  >(
    async (supabase, variables) => {
      const { labelId } = variables

      try {
        const result = await supabase
          .from('labels')
          .delete()
          .eq('id', labelId)
          .select()
          .single()

        if (result.error) {
          throw new Error(`Database deletion failed: ${result.error.message}`)
        }

        if (!result.data) {
          throw new Error('Label not found or already deleted')
        }

        return result
      } catch (error) {
        throw error
      }
    },
    {
      onSuccess: async (_, variables) => {
        setLabels((prev) => {
          const updated = Object.fromEntries(
            Object.entries(prev).filter(([key]) => key !== variables.labelId),
          )
          return updated
        })
      },
    },
  )

  return [mutate, state] as const
}
