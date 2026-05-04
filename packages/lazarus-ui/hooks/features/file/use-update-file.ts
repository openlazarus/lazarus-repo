import { useItems } from '@/hooks/core'
import { useTabs } from '@/hooks/core/use-tabs'
import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { getFileTypeIconComponent } from '@/lib/file-icons'
import { File, createFile } from '@/model/file'
import { useStoreEssentials } from '@/state/store'
import { useFileTabStore } from '@/store/file-tab-store'

interface UpdateFileMutationVariables {
  fileId: string
  fileData: Partial<File>
}

/**
 * Hook to update a file with non-reactive cache updates
 * Prevents cascade re-renders across the application
 */
export const useUpdateFile = () => {
  const { activeWorkspaceId } = useStoreEssentials()
  const { updateItem, getItemById } = useItems('file')
  const { getTabForFile } = useTabs()

  return useSupabaseMutation<File, UpdateFileMutationVariables>(
    async (supabase, variables) => {
      const { data, error } = await supabase
        .from('files')
        .update({ ...variables.fileData })
        .eq('id', variables.fileId)
        .select()
        .single()

      // Transform snake_case to camelCase
      const transformedData = data ? createFile(data) : null

      return { data: transformedData, error }
    },
    {
      table: 'files',
      operation: 'update',
      syncToRepository: false,
      itemType: 'file',
      onSuccess: async (data, variables) => {
        const currentItem = (await getItemById(variables.fileId)) as File | null
        if (currentItem && currentItem.type === 'file') {
          // Update the store's items
          await updateItem(variables.fileId, {
            ...variables.fileData,
            updatedAt: new Date().toISOString(),
          })

          // Update the tab state with file display information
          const currentTab = getTabForFile(variables.fileId)
          if (currentTab) {
            // Update tab directly in Zustand store
            const store = useFileTabStore.getState()
            const updatedTab = {
              id: currentTab.id,
              fileId: currentTab.fileId,
              order: currentTab.order,
              openedAt: currentTab.openedAt,
              lastAccessedAt: new Date(),
              isPinned: currentTab.isPinned ?? false,
              fileInfo: {
                name: variables.fileData.name || currentItem.name || 'Untitled',
                fileType:
                  variables.fileData.fileType ||
                  currentItem.fileType ||
                  'document',
                icon: getFileTypeIconComponent(
                  variables.fileData.fileType ||
                    currentItem.fileType ||
                    'document',
                ),
                scope: currentTab.fileInfo?.scope,
                scopeId: currentTab.fileInfo?.scopeId,
              },
            }
            const newTabs = new Map(store.tabs)
            newTabs.set(currentTab.id, updatedTab)
            useFileTabStore.setState({ tabs: newTabs })
          }
        }
      },
    },
  )
}
