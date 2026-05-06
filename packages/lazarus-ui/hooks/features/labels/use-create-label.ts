import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { Label } from '@/model/label'
import { useStoreEssentials } from '@/state/store'

interface CreateLabelOptions {
  name: string
  color: string
  description?: string
}

interface LabelMutationVariables {
  labelData: {
    id: string
    name: string
    color: string
    description?: string
    workspace_id: string
  }
}

/**
 * Hook to create a new label in the database
 */
export function useCreateLabel() {
  const { activeWorkspaceId } = useStoreEssentials()

  // Supabase mutation to create a label
  const [mutate, state] = useSupabaseMutation<any, LabelMutationVariables>(
    async (supabase, variables) => {
      const { data, error } = await supabase
        .from('labels')
        .insert(variables.labelData)
        .select()
        .single()

      return { data, error }
    },
    {
      table: 'labels',
      operation: 'insert',
    },
  )

  const createLabel = useCallback(
    async (options: CreateLabelOptions): Promise<Label | null> => {
      if (!activeWorkspaceId) {
        console.error('No active workspace')
        return null
      }

      try {
        const labelData = {
          id: uuidv4(),
          name: options.name,
          color: options.color,
          description: options.description,
          workspace_id: activeWorkspaceId,
        }

        const result = await mutate({ labelData })

        if (result.error) {
          console.error('Error creating label:', result.error)
          return null
        }

        return result.data as Label
      } catch (error) {
        console.error('Failed to create label:', error)
        return null
      }
    },
    [activeWorkspaceId, mutate],
  )

  return { createLabel, loading: state.loading, error: state.error }
}
