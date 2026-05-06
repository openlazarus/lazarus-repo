import type { MCPOAuthState } from '@/hooks/features/mcp/types'
import { Item } from './item'

/**
 * MCP Source model - represents a data source/integration in the system
 * Sources are MCP (Model Context Protocol) servers that provide data and tools
 */
export interface Source extends Item {
  type: 'source'
  name: string
  enabled: boolean
  status: string
  description?: string
  command: string
  args?: string[]
  icon?: string
  category?: string
  sourceType?: string
  has_env: boolean
  last_enabled?: string
  last_disabled?: string
  preset_id?: string
  env?: Record<string, string>
  syncProgress?: number
  dataSize?: string
  lastSync?: Date
  // OAuth fields
  requiresOAuth?: boolean
  oauthState?: MCPOAuthState
  authInstructions?: string
}

/**
 * Create a new Source with default values
 */
export function createSource(partial: Partial<Source> = {}): Source {
  const now = new Date().toISOString()

  return {
    id:
      partial.id ||
      Date.now().toString(36) + Math.random().toString(36).substring(2),
    type: 'source',
    name: partial.name || 'New Tool',
    enabled: partial.enabled ?? false,
    status: partial.status || 'disconnected',
    description: partial.description,
    command: partial.command || '',
    args: partial.args || [],
    icon: partial.icon,
    category: partial.category,
    sourceType: partial.sourceType,
    has_env: partial.has_env ?? false,
    last_enabled: partial.last_enabled,
    last_disabled: partial.last_disabled,
    preset_id: partial.preset_id,
    env: partial.env || {},
    syncProgress: partial.syncProgress,
    dataSize: partial.dataSize,
    lastSync: partial.lastSync,
    workspaceId: partial.workspaceId || '',
    createdAt: partial.createdAt || now,
    updatedAt: partial.updatedAt || now,
    metadata: partial.metadata || {},
    labels: partial.labels || [],
  }
}
