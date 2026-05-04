import { useSupabaseQuery } from '@/hooks/data/use-supabase-query'
import { Label } from '@/model/label'
import { useStore } from '@/state/store'

/**
 * Hook to fetch labels for a workspace from the database
 */
export function useGetLabels(workspaceId: string) {
  const { setLabels } = useStore()

  const result = useSupabaseQuery<Label[]>(
    (supabase) =>
      supabase
        .from('labels')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true }),
    {
      enabled: !!workspaceId,
      initialState: [],
      select: (data: any[]): Label[] => {
        if (!Array.isArray(data)) return []
        return data.map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
          description: item.description,
          workspaceId: item.workspace_id,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }))
      },
      onSuccess: (data) => {
        setLabels(
          data.reduce(
            (acc, item) => {
              acc[item.id] = item
              return acc
            },
            {} as Record<string, Label>,
          ),
        )
      },
    },
  )

  return {
    labels: result.data || [],
    loading: result.loading,
    error: result.error,
    refresh: result.refetch,
  }
}
