import { useEffect, useState } from 'react'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import { useIdentity } from '@/state/identity'

import { V0ProjectDescriptor } from './use-v0-projects'

export function useV0Project(
  workspaceId: string,
  projectId: string,
  filePath: string,
) {
  const { profile } = useIdentity()
  const user = profile
  const [project, setProject] = useState<V0ProjectDescriptor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProject() {
      console.log('[useV0Project] Loading project:', {
        workspaceId,
        projectId,
        filePath,
        userId: user?.id,
      })

      if (!workspaceId || !filePath || !user?.id) {
        console.log('[useV0Project] Missing required params')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // filePath may contain workspaceId prefix (e.g., "ws_xxx/filename.app")
        // Extract just the file path without workspace prefix
        const pathParts = filePath.split('/')
        const cleanFilePath =
          pathParts.length > 1 && pathParts[0] === workspaceId
            ? pathParts.slice(1).join('/')
            : filePath

        console.log('[useV0Project] Reading .app file:', {
          originalPath: filePath,
          cleanFilePath,
          workspaceId,
        })

        const response = await fileService.readFile(
          'user',
          workspaceId, // Use workspaceId, NOT user.id
          cleanFilePath,
          user.id,
        )

        console.log('[useV0Project] File loaded successfully:', response)

        // Decode base64 content if needed
        let content = response.content
        if (response.encoding === 'base64') {
          content = Buffer.from(response.content, 'base64').toString('utf-8')
        }

        const projectData = JSON.parse(content)

        // Handle both new schema format (with project wrapper) and old flat format
        const project = (projectData.project ||
          projectData) as V0ProjectDescriptor

        // Validate required fields
        if (!project.id || !project.name) {
          throw new Error('Invalid .app file structure: missing id or name')
        }

        setProject(project)
      } catch (err: any) {
        console.error('[useV0Project] Failed to load v0 project:', err)
        setError(err?.message || 'Failed to load project')
        setProject(null)
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [workspaceId, filePath, user?.id])

  const refreshProject = async () => {
    if (!workspaceId || !filePath || !user?.id) return

    try {
      // filePath may contain workspaceId prefix (e.g., "ws_xxx/filename.app")
      // Extract just the file path without workspace prefix
      const pathParts = filePath.split('/')
      const cleanFilePath =
        pathParts.length > 1 && pathParts[0] === workspaceId
          ? pathParts.slice(1).join('/')
          : filePath

      console.log('[useV0Project] Refreshing project:', {
        originalPath: filePath,
        cleanFilePath,
        workspaceId,
      })

      const response = await fileService.readFile(
        'user',
        workspaceId, // Use workspaceId, NOT user.id
        cleanFilePath,
        user.id,
      )

      // Decode base64 content if needed
      let content = response.content
      if (response.encoding === 'base64') {
        content = Buffer.from(response.content, 'base64').toString('utf-8')
      }

      const projectData = JSON.parse(content)

      // Handle both new schema format (with project wrapper) and old flat format
      const project = (projectData.project ||
        projectData) as V0ProjectDescriptor

      // Validate required fields
      if (!project.id || !project.name) {
        throw new Error('Invalid .app file structure: missing id or name')
      }

      setProject(project)
      console.log('[useV0Project] Project refreshed successfully')
    } catch (err) {
      console.error('[useV0Project] Failed to refresh project:', err)
    }
  }

  return {
    project,
    loading,
    error,
    refreshProject,
  }
}
