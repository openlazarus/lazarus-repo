import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { ItemType } from '@/model/item'
import { Label } from '@/model/label'
import { useStore, useStoreEssentials } from '@/state/store'

interface AddLabelToItemMutationVariables {
  itemId: string
  itemType: ItemType
  labelId: string
  // Optional label data for optimistic updates when label was just created
  labelData?: Partial<Label>
}

export const useAddLabelToItem = () => {
  const { activeWorkspaceId } = useStoreEssentials()
  const store = useStore()

  const [mutate, state] = useSupabaseMutation<
    any,
    AddLabelToItemMutationVariables
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
        .insert({
          [itemColumn]: itemId,
          label_id: labelId,
        })
        .select()

      if (result.error && !result.error.message.includes('duplicate key')) {
        throw new Error(`Failed to add label: ${result.error.message}`)
      }

      return { data: { success: true }, error: null }
    } catch (error) {
      throw error
    }
  }, {})

  return [mutate, state] as const
}
