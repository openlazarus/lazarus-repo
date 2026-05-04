'use client'

import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { apiClient } from '@/lib/api-client'

type FileContent = {
  content: string
  encoding?: 'utf-8' | 'base64'
  size?: number
}
type UploadProgressCallback = (progress: number) => void

const wsHeaders = (workspaceId: string) => ({ 'x-workspace-id': workspaceId })
const wsUrl = (workspaceId: string, path: string) =>
  `${getWorkspaceBaseUrl(workspaceId)}${path}`

/**
 * Imperative hook for file operations where workspaceId is only known at call time
 * (e.g. multi-workspace file explorers). workspaceId is passed to each function,
 * not to the hook itself, and routes to the workspace VM via subdomain.
 */
export const useFileApi = () => {
  const deleteFile = (workspaceId: string, filePath: string) =>
    apiClient.delete(
      wsUrl(
        workspaceId,
        `/api/workspaces/file/${encodeURIComponent(filePath)}`,
      ),
      { headers: wsHeaders(workspaceId) },
    )

  const readFile = async (
    workspaceId: string,
    filePath: string,
  ): Promise<FileContent> => {
    const res = await apiClient.get<FileContent>(
      wsUrl(
        workspaceId,
        `/api/workspaces/file/${encodeURIComponent(filePath)}`,
      ),
      { headers: wsHeaders(workspaceId) },
    )
    return res.data
  }

  const writeFile = (
    workspaceId: string,
    filePath: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8',
  ) =>
    apiClient.put(
      wsUrl(
        workspaceId,
        `/api/workspaces/file/${encodeURIComponent(filePath)}`,
      ),
      { content, encoding },
      { headers: wsHeaders(workspaceId) },
    )

  const moveFile = (
    workspaceId: string,
    sourcePath: string,
    destPath: string,
  ) =>
    apiClient.post(
      wsUrl(workspaceId, `/api/workspaces/move`),
      { source_path: sourcePath, destination_path: destPath },
      { headers: wsHeaders(workspaceId) },
    )

  const lockFile = (workspaceId: string, filePath: string) =>
    apiClient.post(
      wsUrl(workspaceId, `/api/workspaces/file/lock`),
      { path: filePath },
      { headers: wsHeaders(workspaceId) },
    )

  const unlockFile = (workspaceId: string, filePath: string) =>
    apiClient.post(
      wsUrl(workspaceId, `/api/workspaces/file/unlock`),
      { path: filePath },
      { headers: wsHeaders(workspaceId) },
    )

  const createDirectory = (workspaceId: string, dirPath: string) =>
    apiClient.post(
      wsUrl(workspaceId, `/api/workspaces/directory`),
      { path: dirPath },
      { headers: wsHeaders(workspaceId) },
    )

  const uploadFile = async (
    workspaceId: string,
    filePath: string,
    file: File,
    onProgress?: UploadProgressCallback,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', filePath)

    await apiClient.post(
      wsUrl(workspaceId, `/api/workspaces/upload`),
      formData,
      {
        headers: wsHeaders(workspaceId),
        timeout: 600000,
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      },
    )
  }

  return {
    deleteFile,
    readFile,
    writeFile,
    moveFile,
    lockFile,
    unlockFile,
    createDirectory,
    uploadFile,
  }
}
