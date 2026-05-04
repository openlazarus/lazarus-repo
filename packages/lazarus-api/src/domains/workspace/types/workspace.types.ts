import type { MCPServerConfig } from '@domains/mcp/service/mcp-config-manager'

export interface Workspace {
  id: string
  name: string
  slug?: string // Workspace slug for email routing (e.g., {agent}@{slug}.lazarusconnect.com)
  description?: string
  path: string
  additionalPaths?: string[] // Additional paths to include in workspace
  ownerId: string // User who owns this workspace and manages billing
  /** Team scope for team/agent filesystem layouts (optional for DB-backed workspaces) */
  teamId?: string
  /** Internal filesystem workspace kind (not the same as platform “workspace” product) */
  type?: 'team' | 'agent'
  status?: 'pending' | 'active' | 'error' | 'deleted'
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
  mcpServers?: string[] // List of MCP server names
  mcpConfig?: Record<string, any> // Full MCP configuration
}

export interface WorkspaceFile {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt: string
  displayName?: string
  virtual?: boolean
  icon?: string
}

/**
 * Workspace configuration stored in .workspace-config.json
 */
export interface WorkspaceConfig {
  slug: string
  name?: string
  description?: string
  createdAt: string
  updatedAt: string
  version: '1.0'
}

/**
 * Workspace member email information
 */
export interface WorkspaceMemberEmail {
  userId: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
}

/**
 * Email validation result
 */
export interface EmailValidationResult {
  valid: string[]
  invalid: string[]
}

/**
 * Workspace API Key interface
 */
export interface WorkspaceApiKey {
  id: string
  workspaceId?: string
  name: string
  keyHash: string
  keyPrefix: string
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  createdBy?: string
  permissions: {
    databases: string[]
    operations: ('read' | 'write' | 'delete')[]
  }
  rateLimit?: number
}

/**
 * API Key with plaintext (only returned once on creation)
 */
export interface ApiKeyWithSecret extends Omit<WorkspaceApiKey, 'keyHash'> {
  key: string
}

export interface MCPWorkspaceConfig {
  mcpServers: Record<string, MCPServerConfig>
  inheritFrom?: string[] // List of configs to inherit from
}
