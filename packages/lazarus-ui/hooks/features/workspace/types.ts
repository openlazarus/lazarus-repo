export type WorkspaceStatus = 'starting' | 'healthy' | 'unhealthy'

export type Workspace = {
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
  /** Provisioning / health state of the underlying workspace VM. */
  status?: WorkspaceStatus
  /** Public domain URL for the workspace VM (e.g. https://workspace-xxx.your-domain.example). */
  domainUrl?: string
}

export type WorkspaceFile = {
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

export type WorkspaceListResponse = {
  workspaces: Workspace[]
  count: number
}

export type FileListResponse = {
  files: WorkspaceFile[]
  count: number
  path: string
}

export type WorkspaceTemplate = {
  id: string
  name: string
  description: string
  icon: string
  agentTemplateIds: string[]
  category: 'general' | 'sales' | 'finance' | 'custom'
  isPremium?: boolean
}

export type WorkspaceConfig = {
  slug: string
  name?: string
  description?: string
  createdAt: string
  updatedAt: string
  version: string
}
