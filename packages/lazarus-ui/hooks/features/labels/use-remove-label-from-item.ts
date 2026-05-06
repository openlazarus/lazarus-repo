import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { ItemType } from '@/model/item'
import { useStoreEssentials } from '@/state/store'

interface RemoveLabelFromItemMutationVariables {
  itemId: string
  itemType: ItemType
  labelId: string
}

export const useRemoveLabelFromItem = () => {
  const { activeWorkspaceId } = useStoreEssentials()

  const [mutate, state] = useSupabaseMutation<
    any,
    RemoveLabelFromItemMutationVariables
  >(async (supabase, variables) => {
    const { itemId, itemType, labelId } = variables

    const junctionTableConfig = {
      conversation: {
        table: 'conversation_labels',
        itemColumn: 'conversation_id',
      },
      file: {
        table: 'file_labels',
        itemColumn: 'file_id',
      },
      app: null,
      message: null,
    }[itemType]

    if (!junctionTableConfig) {
      throw new Error(`Unsupported item type for junction table: ${itemType}`)
    }

    const { table, itemColumn } = junctionTableConfig

    try {
      const result = await supabase
        .from(table)
        .delete()
        .eq(itemColumn, itemId)
        .eq('label_id', labelId)
        .select()

      if (result.error) {
        throw new Error(`Failed to remove label: ${result.error.message}`)
      }

      return { data: { success: true }, error: null }
    } catch (error) {
      throw error
    }
  }, {})

  return [mutate, state] as const
}
