import { useCallback, useRef } from 'react'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'
import { useFileTypeMapper } from '@/hooks/utils/use-file-type-mapper'
import { createFile as createFileModel } from '@/model/file'

interface UploadOptions {
  file: File | Blob
  path: string
  name?: string
  tags?: string[] | string
  metadata?: Record<string, any> | string
}

interface UploadResponse {
  success: boolean
  path: string
  size: number
  message: string
}

export const useUploadDocument = (
  workspaceId: string,
  onSuccessCallback?: (
    data: any,
    variables: UploadOptions,
    createdFile?: any,
  ) => void | Promise<void>,
  onErrorCallback?: (error: any, variables: UploadOptions) => void,
) => {
  const { getFileTypeFromMimeType } = useFileTypeMapper()

  // Track current variables for the onError callback
  const variablesRef = useRef<UploadOptions | null>(null)
  const onSuccessRef = useRef(onSuccessCallback)
  const onErrorRef = useRef(onErrorCallback)
  onSuccessRef.current = onSuccessCallback
  onErrorRef.current = onErrorCallback

  const [postUpload, { loading, error }] = useAuthPostWorkspaceApi<
    UploadResponse,
    FormData
  >({
    path: '/api/workspaces/upload',
    params: { workspaceId },
    onError: (err) => {
      console.error('Error uploading file:', err)
      if (onErrorRef.current && variablesRef.current) {
        onErrorRef.current(err, variablesRef.current)
      }
    },
  })

  const upload = useCallback(
    async (variables: UploadOptions) => {
      if (!workspaceId) return

      variablesRef.current = variables

      const formData = new FormData()
      formData.append('file', variables.file)
      formData.append('path', variables.path)

      const response = await postUpload(formData)

      if (response) {
        // Build a file item from the upload response
        const fileName =
          variables.name ||
          (variables.file instanceof File ? variables.file.name : 'untitled')

        const mimeType =
          variables.file instanceof File ? variables.file.type : ''
        const fileType = getFileTypeFromMimeType(mimeType)

        // Use the basename (clean alphanumeric ID) for mentions, full path for storage
        const pathParts = response.path.split('/')
        const fileId = pathParts[pathParts.length - 1]

        const createdFile = createFileModel({
          id: fileId,
          name: fileName,
          path: response.path,
          size: response.size,
          fileType,
        })

        if (onSuccessRef.current) {
          await onSuccessRef.current(response, variables, createdFile)
        }
      }
    },
    [workspaceId, postUpload, getFileTypeFromMimeType],
  )

  return [upload, { loading, error }] as const
}
