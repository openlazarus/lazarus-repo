import { useCallback, useEffect, useState } from 'react'

import type { WorkspaceFile } from '@/hooks/features/workspace/types'
import { WorkspaceService } from '@/services/workspace.service'
import { useIdentity } from '@/state/identity'

interface UseWorkspaceFilesOptions {
  path?: string
  autoLoad?: boolean
}

export function useWorkspaceFiles(
  workspaceId: string | null,
  options: UseWorkspaceFilesOptions = {},
) {
  const { path = '', autoLoad = true } = options
  const { profile } = useIdentity()
  const [files, setFiles] = useState<WorkspaceFile[]>([])
  const [currentPath, setCurrentPath] = useState(path)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceService, setWorkspaceService] =
    useState<WorkspaceService | null>(null)

  // Initialize workspace service
  useEffect(() => {
    if (profile?.id) {
      const service = new WorkspaceService()
      setWorkspaceService(service)
    }
  }, [profile?.id])

  // Load files for the workspace
  const loadFiles = useCallback(
    async (loadPath?: string) => {
      if (!workspaceId || !workspaceService) {
        setFiles([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log(
          'Loading files for workspace:',
          workspaceId,
          'path:',
          loadPath || currentPath,
        )
        const response = await workspaceService.listFiles(
          workspaceId,
          loadPath || currentPath,
        )
        console.log('Files loaded:', response)
        setFiles(response.files)
        if (loadPath) {
          setCurrentPath(loadPath)
        }
      } catch (err) {
        console.error('Failed to load files:', err)
        setError(err instanceof Error ? err.message : 'Failed to load files')
        setFiles([])
      } finally {
        setIsLoading(false)
      }
    },
    [workspaceId, workspaceService, currentPath],
  )

  // Auto-load files when workspace changes
  useEffect(() => {
    if (autoLoad && workspaceId && workspaceService) {
      loadFiles(path)
    }
  }, [workspaceId, workspaceService, path, autoLoad])

  // Navigate to a directory
  const navigateTo = useCallback(
    async (newPath: string) => {
      await loadFiles(newPath)
    },
    [loadFiles],
  )

  // Read file content
  const readFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        const content = await workspaceService.readFile(workspaceId, filePath)
        return content
      } catch (err) {
        console.error('Failed to read file:', err)
        throw err
      }
    },
    [workspaceId, workspaceService],
  )

  // Write file content
  const writeFile = useCallback(
    async (filePath: string, content: string) => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        await workspaceService.writeFile(workspaceId, filePath, content)
        // Reload files to reflect changes
        await loadFiles()
        return { success: true }
      } catch (err) {
        console.error('Failed to write file:', err)
        throw err
      }
    },
    [workspaceId, workspaceService, loadFiles],
  )

  // Create a new file
  const createFile = useCallback(
    async (filePath: string, content: string = '') => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        await workspaceService.writeFile(workspaceId, filePath, content)
        // Reload files to reflect changes
        await loadFiles()
        return { success: true }
      } catch (err) {
        console.error('Failed to create file:', err)
        throw err
      }
    },
    [workspaceId, workspaceService, loadFiles],
  )

  // Create a directory (using write file with a special marker)
  const createDirectory = useCallback(
    async (dirPath: string) => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        // Create a .gitkeep file to create the directory
        const gitkeepPath = dirPath.endsWith('/')
          ? `${dirPath}.gitkeep`
          : `${dirPath}/.gitkeep`

        await workspaceService.writeFile(workspaceId, gitkeepPath, '')
        // Reload files to reflect changes
        await loadFiles()
        return { success: true }
      } catch (err) {
        console.error('Failed to create directory:', err)
        throw err
      }
    },
    [workspaceId, workspaceService, loadFiles],
  )

  // Delete a file or directory
  const deleteFile = useCallback(
    async (filePath: string) => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        await workspaceService.deleteFile(workspaceId, filePath)
        // Reload files to reflect changes
        await loadFiles()
        return { success: true }
      } catch (err) {
        console.error('Failed to delete file:', err)
        throw err
      }
    },
    [workspaceId, workspaceService, loadFiles],
  )

  // Move/rename a file (not directly supported, would need backend update)
  const moveFile = useCallback(
    async (from: string, to: string) => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        // This would need backend support for move operations
        // For now, we could implement as copy + delete
        const content = await workspaceService.readFile(workspaceId, from)
        await workspaceService.writeFile(
          workspaceId,
          to,
          content.content,
          content.encoding === 'base64' ? 'base64' : 'utf-8',
        )
        await workspaceService.deleteFile(workspaceId, from)

        // Reload files to reflect changes
        await loadFiles()
        return { success: true }
      } catch (err) {
        console.error('Failed to move file:', err)
        throw err
      }
    },
    [workspaceId, workspaceService, loadFiles],
  )

  // Copy a file (not directly supported, would need backend update)
  const copyFile = useCallback(
    async (from: string, to: string) => {
      if (!workspaceId || !workspaceService) {
        throw new Error('No workspace selected')
      }

      try {
        const content = await workspaceService.readFile(workspaceId, from)
        await workspaceService.writeFile(
          workspaceId,
          to,
          content.content,
          content.encoding === 'base64' ? 'base64' : 'utf-8',
        )

        // Reload files to reflect changes
        await loadFiles()
        return { success: true }
      } catch (err) {
        console.error('Failed to copy file:', err)
        throw err
      }
    },
    [workspaceId, workspaceService, loadFiles],
  )

  // Search files (client-side for now)
  const searchFiles = useCallback(
    async (query: string) => {
      if (!files) return { results: [], count: 0 }

      const results = files.filter((file) =>
        file.name.toLowerCase().includes(query.toLowerCase()),
      )

      return {
        results: results.map((f) => ({
          path: f.path,
          type: f.type,
          size: f.size || 0,
          modified: f.modifiedAt || new Date().toISOString(),
        })),
        count: results.length,
      }
    },
    [files],
  )

  return {
    files,
    currentPath,
    isLoading,
    error,
    loadFiles,
    navigateTo,
    readFile,
    writeFile,
    createFile,
    createDirectory,
    deleteFile,
    moveFile,
    copyFile,
    searchFiles,
    refresh: loadFiles,
  }
}
