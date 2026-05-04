import { useEffect, useState } from 'react'

import { fileService } from '@/app/(main)/files/components/services/file.service'
import { useAuth } from '@/hooks/auth/use-auth'

export interface V0ProjectDescriptor {
  id: string
  name: string
  description?: string
  chatId: string
  projectId?: string
  webUrl?: string
  deploymentUrl?: string
  deploymentStatus?: string
  deploymentPlatform?: string
  status: 'ready' | 'deploying' | 'deployed' | 'error'
  latestDeployment?: {
    id: string
    url: string
    status: string
    createdAt: string
  }
  environmentVars?: Array<{ key: string; value: string; synced?: boolean }>
  technicalStack?: string[]
  features?: string[]
  filesSummary?: {
    count: number
    languages: string[]
  }
  createdAt: string
  updatedAt: string
  path?: string
}

interface V0ProjectsIndex {
  version: string
  projects: Array<{
    id: string
    name: string
    path: string
    status: string
    updatedAt: string
  }>
  lastUpdated: string
}

export function useV0Projects(workspaceId: string) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<V0ProjectDescriptor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProjects() {
      if (!workspaceId || !user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // List all files in workspace root
        const filesResponse = await fileService.listFiles(
          'user',
          workspaceId,
          '/',
          user.id,
        )

        // Filter for .app files
        const appFiles = filesResponse.files.filter(
          (f) => f.isFile && f.name.toLowerCase().endsWith('.app'),
        )

        // Load content of each .app file
        const projectDetails = await Promise.all(
          appFiles.map(async (file) => {
            try {
              const contentResponse = await fileService.readFile(
                'user',
                workspaceId,
                file.path,
                user.id,
              )

              // Decode base64 content if needed
              let content = contentResponse.content
              if (contentResponse.encoding === 'base64') {
                content = Buffer.from(
                  contentResponse.content,
                  'base64',
                ).toString('utf-8')
              }

              const projectData = JSON.parse(content)

              // Handle both new schema format (with project wrapper) and old flat format
              const project = projectData.project || projectData

              // Validate required fields
              if (!project.id || !project.name) {
                console.error(
                  `Invalid .app file structure in ${file.name}:`,
                  project,
                )
                return null
              }

              // Add path to the project data
              return {
                ...project,
                path: file.path,
              } as V0ProjectDescriptor
            } catch (err) {
              console.error(`Failed to load project ${file.name}:`, err)
              return null
            }
          }),
        )

        setProjects(projectDetails.filter(Boolean) as V0ProjectDescriptor[])
      } catch (err: any) {
        console.error('Failed to load v0 projects:', err)
        setError(err?.message || 'Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [workspaceId, user?.id])

  const refreshProjects = async () => {
    if (!workspaceId || !user?.id) return

    try {
      // List all files in workspace root
      const filesResponse = await fileService.listFiles(
        'user',
        workspaceId,
        '/',
        user.id,
      )

      // Filter for .app files
      const appFiles = filesResponse.files.filter(
        (f) => f.isFile && f.name.toLowerCase().endsWith('.app'),
      )

      // Load content of each .app file
      const projectDetails = await Promise.all(
        appFiles.map(async (file) => {
          try {
            const contentResponse = await fileService.readFile(
              'user',
              workspaceId,
              file.path,
              user.id,
            )

            // Decode base64 content if needed
            let content = contentResponse.content
            if (contentResponse.encoding === 'base64') {
              content = Buffer.from(contentResponse.content, 'base64').toString(
                'utf-8',
              )
            }

            const projectData = JSON.parse(content)

            // Handle both new schema format (with project wrapper) and old flat format
            const project = projectData.project || projectData

            // Validate required fields
            if (!project.id || !project.name) {
              console.error(
                `Invalid .app file structure in ${file.name}:`,
                project,
              )
              return null
            }

            // Add path to the project data
            return {
              ...project,
              path: file.path,
            } as V0ProjectDescriptor
          } catch {
            return null
          }
        }),
      )

      setProjects(projectDetails.filter(Boolean) as V0ProjectDescriptor[])
    } catch (err) {
      console.error('Failed to refresh projects:', err)
    }
  }

  return {
    projects,
    loading,
    error,
    refreshProjects,
  }
}
