import { useAuth } from '@/hooks/auth/use-auth'
import { useProfile } from '@/hooks/auth/use-profile'
import { useSupabaseMutation } from '@/hooks/data/use-supabase-mutation'

interface UploadAvatarOptions {
  file: File
  fileName: string
}

interface UploadAvatarCallbacks {
  onSuccess?: (publicUrl: string) => void
  onError?: (error: any) => void
}

export const useUploadAvatar = (callbacks?: UploadAvatarCallbacks) => {
  const { profile, updateProfile } = useProfile()
  const { refetchProfile } = useAuth()

  return useSupabaseMutation<string | null, UploadAvatarOptions>(
    async (supabase, variables) => {
      const { file, fileName } = variables
      const userId = profile?.id

      if (!userId) {
        console.error('User not authenticated')
        return { data: null, error: new Error('User not authenticated') }
      }

      // Use the public avatars bucket
      const bucketName = 'avatars'

      // Upload path: {userId}/fileName (organize by user ID)
      const filePath = `${userId}/${fileName}`

      console.log('Uploading avatar to public bucket:', {
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
        console.error('Avatar upload error:', uploadError)
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
          console.log('Updating profile with new avatar URL:', publicUrl)
          // Update user profile with new avatar URL using useProfile hook
          await updateProfile({
            avatar: publicUrl,
          })

          // Trigger a refetch to update the profile everywhere
          if (refetchProfile) {
            await refetchProfile()
          }

          // Call the external onSuccess callback if provided
          callbacks?.onSuccess?.(publicUrl)
        }
      },
      onError: (error) => {
        console.error('Avatar upload mutation failed:', error)
        callbacks?.onError?.(error)
      },
    },
  )
}
