import { useCallback } from 'react'

import { useItems } from '@/hooks/core/use-items'
import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'
import { File, FileType, createFile } from '@/model/file'
import { useStoreEssentials } from '@/state/store'

interface CreateFileOptions {
  name?: string
  path?: string
  content?: string
  metadata?: Record<string, any>
  thumbnailUrl?: string
}

interface FileMutationVariables {
  fileData: {
    id: string
    name: string
    path: string
    file_type: FileType
    size: number
    content?: string
    thumbnail_url?: string
    preview?: string | null
    workspace_id: string
    metadata: Record<string, any>
  }
  optimisticFile?: File
}

const prepareSupabaseData = (file: File) => ({
  id: file.id,
  name: file.name || '',
  path: file.path,
  file_type: file.fileType,
  size: file.size || 0,
  content: file.content,
  thumbnail_url: file.thumbnailUrl,
  preview: file.preview,
  workspace_id: file.workspaceId,
  metadata: file.metadata || {},
})

const createFileFromSupabase = (newFile: File, supabaseData: any): File => ({
  ...newFile,
  id: supabaseData.id || newFile.id,
  createdAt: supabaseData.created_at || newFile.createdAt,
  updatedAt: supabaseData.updated_at || newFile.updatedAt,
})

/**
 * Hook to create a new file with automatic cache invalidation and repository sync
 * Non-reactive version that prevents cascade re-renders
 */
export function useCreateFile() {
  const { activeWorkspaceId, repository } = useStoreEssentials()
  const { createItem, getItemById } = useItems()

  const [mutate, state] = useSupabaseMutation<any, FileMutationVariables>(
    async (supabase, variables) => {
      const { data, error } = await supabase
        .from('files')
        .insert(variables.fileData)
        .select()
        .single()

      return { data, error }
    },
    {
      table: 'files',
      operation: 'insert',
      syncToRepository: true,
      itemType: 'file',
      onSuccess: async (data, variables) => {
        // Update the store's items object after successful database operation
        await createItem('file', variables.fileData)
      },
    },
  )

  /**
   * Create a new file
   */
  const createNewFile = useCallback(
    async (
      fileType: FileType,
      options: CreateFileOptions = {},
    ): Promise<File | null> => {
      if (!activeWorkspaceId) {
        console.error('No active workspace selected')
        return null
      }

      try {
        const newFile = createFile({
          ...options,
          path: options.path || '/',
          content: options.content || '',
          metadata: options.metadata || {},
          fileType,
          workspaceId: activeWorkspaceId,
        })

        const supabaseFileData = prepareSupabaseData(newFile)

        const result = await mutate({
          fileData: supabaseFileData,
          optimisticFile: newFile,
        })

        if (result.error) {
          console.error('Error creating file:', result.error.message)
          throw new Error(result.error.message || 'Failed to create file')
        }

        if (result.data) {
          const createdFile = createFileFromSupabase(newFile, result.data)
          await repository.saveItem(createdFile)
          return createdFile
        }

        return newFile
      } catch (error) {
        console.error('Failed to create file:', error)
        return null
      }
    },
    [activeWorkspaceId, repository, mutate],
  )

  return {
    createFile: createNewFile,
    loading: state.loading,
    error: state.error,
  }
}
