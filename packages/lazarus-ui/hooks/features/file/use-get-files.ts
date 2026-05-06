import { useItems } from '@/hooks/core/use-items'
import { useInfiniteSupabaseQuery } from '@/hooks/data/use-infinite-supabase-query'
import { File, createFile } from '@/model/file'

interface GetFilesOptions {
  search?: string
  labels?: string[]
  pageSize?: number
}

/**
 * Hook to fetch and manage files with non-reactive caching and infinite loading
 * Uses server-side filtering for search and labels
 * @param workspaceId The ID of the workspace to fetch files from
 * @param options Search and filter options
 */
export const useGetFiles = (
  workspaceId: string,
  options: GetFilesOptions = {},
) => {
  const { search, labels } = options
  const { createItem } = useItems('file')

  // Use the infinite query hook for pagination
  const {
    data: files,
    loading,
    error,
    mutate,
    loadMore,
    hasMore,
    fetchingMore,
    isRefreshing,
    isValidating,
    sources,
    reset,
    count: totalCount,
  } = useInfiniteSupabaseQuery<File>(
    (supabase) => {
      // When filtering by labels, use inner join for filtering but also fetch all labels
      const selectQuery =
        labels && labels.length > 0
          ? `
          *,
          file_labels!inner(
            id,
            label_id,
            labels(
              id,
              name,
              color,
              description
            )
          ),
          all_file_labels:file_labels(
            id,
            label_id,
            labels(
              id,
              name,
              color,
              description
            )
          )
        `
          : `
          *,
          file_labels(
            id,
            label_id,
            labels(
              id,
              name,
              color,
              description
            )
          )
        `

      let query = supabase
        .from('files')
        .select(selectQuery, { count: 'exact' })
        .eq('workspace_id', workspaceId)

      // Add server-side search filter
      if (search?.trim()) {
        query = query.ilike('name', `%${search.trim()}%`)
      }

      // Add server-side label filtering (OR logic)
      if (labels && labels.length > 0) {
        // Filter files that have at least one of the selected labels
        query = query.in('file_labels.label_id', labels)
      }

      return query.order('updated_at', { ascending: false })
    },
    {
      enabled: !!workspaceId?.trim(),
      deps: [workspaceId, search, labels],
      initialState: [],
      select: (data: any) => {
        // When filtering by labels, rename all_file_labels back to file_labels
        if (data.all_file_labels) {
          data.file_labels = data.all_file_labels
          delete data.all_file_labels
        }
        return createFile(data)
      },
      pageSize: labels?.length || search?.trim() ? 50 : 5,
      onSuccess: (data) => {
        data.forEach((file) => {
          createItem('file', file)
        })
      },
    },
  )

  return {
    files: files || [],
    loading,
    fetchingMore,
    error,
    hasMore,
    loadMore,
    sources,
    mutate,
    isRefreshing,
    isValidating,
    reset,
    totalCount,
  }
}
