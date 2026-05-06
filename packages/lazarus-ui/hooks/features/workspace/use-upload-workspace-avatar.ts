import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'

interface UploadWorkspaceAvatarOptions {
  workspaceId: string
  file: File
  fileName: string
}

interface UploadWorkspaceAvatarCallbacks {
  onSuccess?: (publicUrl: string) => void
  onError?: (error: any) => void
}

/**
 * Hook for uploading workspace avatar images to Supabase storage.
 * Uploads to the public 'avatars' bucket under 'workspaces/{workspaceId}/' path.
 */
export const useUploadWorkspaceAvatar = (
  callbacks?: UploadWorkspaceAvatarCallbacks,
) => {
  return useSupabaseMutation<string | null, UploadWorkspaceAvatarOptions>(
    async (supabase, variables) => {
      const { workspaceId, file, fileName } = variables

      if (!workspaceId) {
        console.error('Workspace ID is required')
        return { data: null, error: new Error('Workspace ID is required') }
      }

      // Use the public avatars bucket
      const bucketName = 'avatars'

      // Upload path: workspaces/{workspaceId}/fileName
      const filePath = `workspaces/${workspaceId}/${fileName}`

      console.log('Uploading workspace avatar to public bucket:', {
        bucketName,
        filePath,
        fileSize: file.size,
      })

      // Upload to public avatars bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Replace if exists
        })

      if (uploadError) {
        console.error('Workspace avatar upload error:', uploadError)
        return { data: null, error: uploadError }
      }

      console.log('Upload successful:', uploadData)

      // Get public URL (bucket is public, so this is a real public URL)
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(filePath)

      console.log('Public URL generated:', publicUrl)

      return {
        data: publicUrl,
        error: null,
      }
    },
    {
      onSuccess: async (publicUrl) => {
        if (publicUrl) {
          console.log('Workspace avatar uploaded successfully:', publicUrl)
          callbacks?.onSuccess?.(publicUrl)
        }
      },
      onError: (error) => {
        console.error('Workspace avatar upload mutation failed:', error)
        callbacks?.onError?.(error)
      },
    },
  )
}
