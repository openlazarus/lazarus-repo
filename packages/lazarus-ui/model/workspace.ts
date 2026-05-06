/**
 * Workspace role types for workspace members
 */
export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'developer'
  | 'editor'
  | 'member'
  | 'viewer'

/**
 * Workspace member interface
 */
export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_by?: string | null
  joined_at: string
  created_at: string
  updated_at: string
  // Joined profile data (optional)
  profile?: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    avatar?: string
  }
}

/**
 * Workspace invitation interface
 */
export interface WorkspaceInvitation {
  id: string
  workspace_id: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  invited_by: string
  code: string
  expires_at: string
  accepted_at?: string | null
  declined_at?: string | null
  created_at: string
}

/**
 * Supabase Workspace model - represents a workspace in the Supabase database (for indexing)
 */
export interface SupabaseWorkspace {
  id: string
  name: string
  description?: string
  slug: string
  owner_id: string
  user_id: string
  settings?: Record<string, any>
  avatar?: string | null
  color?: string | null
  needs_onboarding?: boolean
  created_at: string
  updated_at: string
}

/**
 * Backend Workspace model - represents a workspace from the lazarus-ts backend
 * This is the source of truth for workspace data
 */
export type WorkspaceStatus = 'starting' | 'healthy' | 'unhealthy'

export interface BackendWorkspace {
  id: string
  name: string
  description?: string
  path: string
  ownerId: string
  createdAt: string
  updatedAt?: string
  metadata?: Record<string, any>
  mcpServers?: string[]
  mcpConfig?: Record<string, any>
  additionalPaths?: string[]
  avatar?: string | null
  color?: string | null
  /** Provisioning / health state of the underlying workspace VM. */
  status?: WorkspaceStatus
  /** Public domain URL for the workspace VM (e.g. https://workspace-xxx.your-domain.example). */
  domainUrl?: string
}

/**
 * Unified Workspace interface - combines backend and frontend data
 * This is what the UI uses throughout the application
 */
export interface Workspace extends BackendWorkspace {
  // Frontend-specific fields
  uploadEmail?: string
  slug?: string
  userId?: string
  user_id?: string
  owner_id?: string
  isDefault?: boolean
  needsOnboarding?: boolean
  // Member info (when fetched with membership context)
  userRole?: WorkspaceRole
  isOwner?: boolean
  memberCount?: number
}

/**
 * Server model (deprecated - use Workspace instead)
 * @deprecated Use Workspace interface instead
 */
export interface Server {
  id: string
  type: 'server'
  name: string
  description?: string
  userId: string
  ownerId: string
  isDefault?: boolean
  settings?: Record<string, any>
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
  uploadEmail: string
  slug: string
}

/**
 * Create a new Workspace with default values
 */
export function createWorkspace(partial: Partial<Workspace> = {}): Workspace {
  const now = new Date().toISOString()

  return {
    id: partial.id || generateItemId(),
    name: partial.name || 'New Workspace',
    description: partial.description || '',
    path: partial.path || '',
    ownerId: partial.ownerId || partial.userId || '',
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    metadata: partial.metadata || {},
    mcpServers: partial.mcpServers || [],
    mcpConfig: partial.mcpConfig,
    additionalPaths: partial.additionalPaths,
    uploadEmail: partial.uploadEmail,
    slug: partial.slug,
    userId: partial.userId || partial.ownerId,
    owner_id: partial.owner_id || partial.ownerId,
    isDefault: partial.isDefault || false,
    avatar: partial.avatar,
    color: partial.color,
  }
}

/**
 * Create a new Server with default values
 * @deprecated Use createWorkspace instead
 */
export function createServer(partial: Partial<Server> = {}): Server {
  const now = new Date().toISOString()

  return {
    id: partial.id || generateItemId(),
    type: 'server',
    name: partial.name || 'New Server',
    description: partial.description || '',
    userId: partial.userId || '',
    ownerId: partial.ownerId || partial.userId || '',
    isDefault: partial.isDefault || false,
    settings: partial.settings || {},
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    metadata: partial.metadata || {},
    uploadEmail: partial.uploadEmail || '',
    slug: partial.slug || '',
  }
}

/**
 * Convert a Supabase workspace to a unified Workspace
 */
export function fromSupabaseWorkspace(supabase: SupabaseWorkspace): Workspace {
  return {
    id: supabase.id,
    name: supabase.name,
    description: supabase.description,
    path: '', // Will be populated from backend
    ownerId: supabase.owner_id || supabase.user_id,
    createdAt: supabase.created_at,
    updatedAt: supabase.updated_at,
    metadata: supabase.settings,
    slug: supabase.slug,
    userId: supabase.user_id,
    owner_id: supabase.owner_id,
    avatar: supabase.avatar,
    color: supabase.color,
    needsOnboarding: supabase.needs_onboarding,
  }
}

/**
 * Convert a backend workspace to a unified Workspace
 */
export function fromBackendWorkspace(backend: BackendWorkspace): Workspace {
  return {
    ...backend,
    userId: backend.ownerId,
    owner_id: backend.ownerId,
    slug: backend.id, // Use ID as slug for backend workspaces
  }
}

/**
 * Check if a user is the workspace owner
 */
export function isWorkspaceOwner(
  workspace: Workspace,
  userId: string,
): boolean {
  return workspace.ownerId === userId || workspace.owner_id === userId
}

/**
 * Check if a user is an admin or owner
 */
export function isWorkspaceAdmin(
  workspace: Workspace,
  userId: string,
  userRole?: WorkspaceRole,
): boolean {
  if (isWorkspaceOwner(workspace, userId)) return true
  return userRole === 'admin' || userRole === 'owner'
}

/**
 * Check if a user can edit workspace content
 */
export function canEditWorkspace(
  workspace: Workspace,
  userId: string,
  userRole?: WorkspaceRole,
): boolean {
  if (isWorkspaceOwner(workspace, userId)) return true
  return userRole === 'admin' || userRole === 'editor' || userRole === 'owner'
}

/**
 * Utility function to generate a unique ID for a server
 */
function generateItemId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}
