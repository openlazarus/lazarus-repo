import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api, apiClient } from '@/lib/api-client'
import { createClient } from '@/utils/supabase/client'

const wsHeaders = (workspaceId: string) => ({ 'x-workspace-id': workspaceId })
const wsUrl = (workspaceId: string, path: string) =>
  `${getWorkspaceBaseUrl(workspaceId)}${path}`

export type UploadProgressCallback = (progress: number) => void

export interface Workspace {
  id: string
  name: string
  description?: string
  type: 'user' | 'team'
  ownerId: string
  teamId?: string
  teamName?: string
  path: string
  createdAt: string
  updatedAt?: string
  avatar?: string | null
  color?: string | null
}

export interface WorkspaceFile {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
  isLocked?: boolean
  displayName?: string
  virtual?: boolean
  icon?: string
}

export interface WorkspaceListResponse {
  workspaces: Workspace[]
  count: number
}

export interface FileListResponse {
  files: WorkspaceFile[]
  count: number
  path: string
}

export class WorkspaceService {
  private static defaultWorkspaceCache: Map<string, Workspace> = new Map()

  constructor() {
    // No longer needs baseUrl or userId - API client handles auth automatically
  }

  async listWorkspaces(): Promise<WorkspaceListResponse> {
    return api.get<WorkspaceListResponse>('/api/workspaces')
  }

  async createWorkspace(data: {
    name: string
    description?: string
    type?: 'user' | 'team'
    mcpServers?: string[]
    templateId?: string
  }): Promise<{ workspace: Workspace }> {
    return api.post<{ workspace: Workspace }>('/api/workspaces', {
      ...data,
      type: data.type || 'user',
      templateId: data.templateId || 'default',
    })
  }

  async getWorkspaceTemplates(): Promise<{
    success: boolean
    templates: Array<{
      id: string
      name: string
      description: string
      icon: string
      agentTemplateIds: string[]
      category: 'general' | 'sales' | 'finance' | 'custom'
      isPremium?: boolean
    }>
  }> {
    return api.get('/api/workspaces/templates')
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return api.get<Workspace>(`/api/workspaces/${workspaceId}`)
  }

  async updateWorkspace(
    workspaceId: string,
    data: {
      name?: string
      description?: string
      mcpServers?: string[]
    },
  ): Promise<Workspace> {
    return api.put<Workspace>(`/api/workspaces/${workspaceId}`, data)
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await api.delete<void>(`/api/workspaces/${workspaceId}`)
  }

  async listFiles(
    workspaceId: string,
    path?: string,
  ): Promise<FileListResponse> {
    return api.get<FileListResponse>(
      wsUrl(workspaceId, '/api/workspaces/files'),
      {
        headers: wsHeaders(workspaceId),
        ...(path ? { params: { path } } : {}),
      },
    )
  }

  async readFile(
    workspaceId: string,
    filePath: string,
  ): Promise<{
    content: string
    encoding?: 'utf-8' | 'base64'
    size?: number
  }> {
    return api.get<{
      content: string
      encoding?: 'utf-8' | 'base64'
      size?: number
    }>(wsUrl(workspaceId, `/api/workspaces/file/${filePath}`), {
      headers: wsHeaders(workspaceId),
    })
  }

  async writeFile(
    workspaceId: string,
    filePath: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8',
  ): Promise<void> {
    await api.put<void>(
      wsUrl(workspaceId, `/api/workspaces/file/${filePath}`),
      { content, encoding },
      { headers: wsHeaders(workspaceId) },
    )
  }

  async deleteFile(workspaceId: string, filePath: string): Promise<void> {
    await api.delete<void>(
      wsUrl(workspaceId, `/api/workspaces/file/${filePath}`),
      { headers: wsHeaders(workspaceId) },
    )
  }

  async moveFile(
    workspaceId: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<{ success: boolean; message: string }> {
    return api.post<{ success: boolean; message: string }>(
      wsUrl(workspaceId, '/api/workspaces/move'),
      {
        source_path: sourcePath,
        destination_path: destinationPath,
      },
      { headers: wsHeaders(workspaceId) },
    )
  }

  async createDirectory(
    workspaceId: string,
    dirPath: string,
  ): Promise<{ success: boolean; message: string; path: string }> {
    return api.post<{ success: boolean; message: string; path: string }>(
      wsUrl(workspaceId, '/api/workspaces/directory'),
      { path: dirPath },
      { headers: wsHeaders(workspaceId) },
    )
  }

  async createFile(
    workspaceId: string,
    filePath: string,
    content: string = '',
    encoding: 'utf-8' | 'base64' = 'utf-8',
  ): Promise<void> {
    await api.put<void>(
      wsUrl(workspaceId, `/api/workspaces/file/${filePath}`),
      { content, encoding },
      { headers: wsHeaders(workspaceId) },
    )
  }

  async lockFile(workspaceId: string, filePath: string): Promise<void> {
    await api.post<void>(
      wsUrl(workspaceId, '/api/workspaces/file/lock'),
      { path: filePath },
      { headers: wsHeaders(workspaceId) },
    )
  }

  async unlockFile(workspaceId: string, filePath: string): Promise<void> {
    await api.post<void>(
      wsUrl(workspaceId, '/api/workspaces/file/unlock'),
      { path: filePath },
      { headers: wsHeaders(workspaceId) },
    )
  }

  /**
   * Upload a file using multipart/form-data (efficient for binary files)
   * Supports progress tracking via onProgress callback
   */
  async uploadFile(
    workspaceId: string,
    filePath: string,
    file: File,
    onProgress?: UploadProgressCallback,
  ): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', filePath)

    // Use apiClient directly for progress tracking support
    // Content-Type is automatically handled by the interceptor for FormData
    await apiClient.post(
      wsUrl(workspaceId, '/api/workspaces/upload'),
      formData,
      {
        headers: wsHeaders(workspaceId),
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            )
            onProgress(progress)
          }
        },
      },
    )
  }

  /**
   * Get or create a default workspace for the user
   * This ensures each user always has at least one workspace to work with
   */
  async getOrCreateDefaultWorkspace(): Promise<Workspace> {
    // Get current user ID from Supabase for caching
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    // Check cache first
    if (userId) {
      const cached = WorkspaceService.defaultWorkspaceCache.get(userId)
      if (cached) {
        return cached
      }
    }

    try {
      // Get existing workspaces from database
      // Database trigger should have created "Default Workspace" on signup
      const response = await this.listWorkspaces()

      // Look for workspace named "Default Workspace" (standardized name)
      let defaultWorkspace = response.workspaces.find(
        (ws) => ws.name === 'Default Workspace',
      )

      // Fallback: If no "Default Workspace" found, use first user workspace
      // This handles migration cases or if trigger failed
      if (!defaultWorkspace && response.workspaces.length > 0) {
        console.warn(
          '[WorkspaceService] No "Default Workspace" found, using first user workspace',
        )
        defaultWorkspace = response.workspaces.find((ws) => ws.type === 'user')
        if (!defaultWorkspace) {
          defaultWorkspace = response.workspaces[0]
        }
      }

      // If still no workspace found, this indicates a serious issue
      // Database trigger should have created workspace on signup
      if (!defaultWorkspace) {
        console.error(
          '[WorkspaceService] No workspaces found for user. Signup trigger may have failed.',
        )
        throw new Error(
          'No default workspace found. Please contact support or try logging out and back in.',
        )
      }

      // Cache the result
      if (userId) {
        WorkspaceService.defaultWorkspaceCache.set(userId, defaultWorkspace)
      }

      return defaultWorkspace
    } catch (error) {
      console.error(
        '[WorkspaceService] Failed to get default workspace:',
        error,
      )
      throw error
    }
  }

  /**
   * Clear the default workspace cache for a user
   */
  static clearDefaultWorkspaceCache(userId?: string) {
    if (userId) {
      WorkspaceService.defaultWorkspaceCache.delete(userId)
    } else {
      WorkspaceService.defaultWorkspaceCache.clear()
    }
  }
}
