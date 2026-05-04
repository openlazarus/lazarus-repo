import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import { api } from '@/lib/api-client'

const wsHeaders = (workspaceId: string) => ({ 'x-workspace-id': workspaceId })
const wsUrl = (workspaceId: string, path: string) =>
  `${getWorkspaceBaseUrl(workspaceId)}${path}`

export interface EnvVariable {
  required: boolean
  secure: boolean
  type?: 'text' | 'file'
  placeholder?: string
  validation?: string
  description?: string
  min_length?: number
  max_length?: number
}

export type MCPAuthType = 'none' | 'api_key' | 'oauth' | 'oauth_pkce'

export interface MCPOAuthState {
  status: 'not_required' | 'pending' | 'authorized' | 'expired' | 'error'
  authorizationUrl?: string
  error?: string
  expiresAt?: string
  authorizedAt?: string
}

export interface MCPPreset {
  id?: string
  name: string
  description: string
  icon: string
  category: string
  command: string
  args: string[]
  transport?: 'stdio' | 'http' | 'sse'
  env_schema: Record<string, EnvVariable>
  // OAuth configuration
  authType?: MCPAuthType
  requiresOAuth?: boolean
  authInstructions?: string
}

export interface MCPServer {
  enabled: boolean
  description?: string
  command: string
  args?: string[]
  icon?: string
  category?: string
  has_env: boolean
  last_enabled?: string
  last_disabled?: string
  created_at?: string
  updated_at?: string
  preset_id?: string
  env?: Record<string, string>
  // OAuth fields
  requiresOAuth?: boolean
  oauthState?: MCPOAuthState
  authInstructions?: string
}

export interface ServerStatus {
  reachable: boolean
  latency?: number
  error?: string
}

export interface MCPTool {
  name: string
  description?: string
  inputSchema?: {
    type: string
    properties?: Record<string, any>
  }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface ConnectionTestResult {
  connected: boolean
  latencyMs?: number
  toolsCount: number
  tools: MCPTool[]
  resourcesCount?: number
  resources?: MCPResource[]
  note?: string
  error?: string
  serverName?: string
  serverInfo?: {
    enabled: boolean
    icon?: string
    category?: string
    description?: string
  }
  // OAuth fields
  requiresOAuth?: boolean
  oauthState?: MCPOAuthState
  authInstructions?: string
  // Credential validation fields
  credentialsValid?: boolean
  credentialsError?: string
  validationTool?: string
}

export interface OAuthStatusResult {
  requiresOAuth: boolean
  oauthState: MCPOAuthState
  authInstructions?: string
}

export interface InitiateOAuthResult {
  authorizationUrl?: string
  oauthState: MCPOAuthState
  authInstructions?: string
  error?: string
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

export class MCPService {
  constructor() {
    // API client handles baseUrl and authentication automatically
  }

  // Instance methods (workspace-aware, require authentication)
  async getAvailableSources(workspaceId: string): Promise<{
    availableServers: Array<{
      name: string
      enabled: boolean
      enabledInWorkspace: boolean
      description?: string
      icon?: string
      category?: string
    }>
    enabledInWorkspace: string[]
  }> {
    return api.get(wsUrl(workspaceId, '/api/workspaces/mcp/sources'), {
      headers: wsHeaders(workspaceId),
    })
  }

  async enableMCPServer(
    workspaceId: string,
    serverName: string,
  ): Promise<void> {
    await api.post(
      wsUrl(workspaceId, `/api/workspaces/mcp/servers/${serverName}/enable`),
      undefined,
      { headers: wsHeaders(workspaceId) },
    )
  }

  async disableMCPServer(
    workspaceId: string,
    serverName: string,
  ): Promise<void> {
    await api.post(
      wsUrl(workspaceId, `/api/workspaces/mcp/servers/${serverName}/disable`),
      undefined,
      { headers: wsHeaders(workspaceId) },
    )
  }

  async testConnection(
    workspaceId: string,
    serverName: string,
  ): Promise<ConnectionTestResult> {
    return api.post<ConnectionTestResult>(
      wsUrl(
        workspaceId,
        `/api/workspaces/mcp/servers/${serverName}/test-connection`,
      ),
      undefined,
      { headers: wsHeaders(workspaceId) },
    )
  }

  async getOAuthStatus(
    workspaceId: string,
    serverName: string,
  ): Promise<OAuthStatusResult> {
    return api.get<OAuthStatusResult>(
      wsUrl(
        workspaceId,
        `/api/workspaces/mcp/servers/${serverName}/oauth-status`,
      ),
      { headers: wsHeaders(workspaceId) },
    )
  }

  async initiateOAuth(
    workspaceId: string,
    serverName: string,
  ): Promise<InitiateOAuthResult> {
    return api.post<InitiateOAuthResult>(
      wsUrl(
        workspaceId,
        `/api/workspaces/mcp/servers/${serverName}/initiate-oauth`,
      ),
      undefined,
      { headers: wsHeaders(workspaceId) },
    )
  }

  async markAuthorized(
    workspaceId: string,
    serverName: string,
  ): Promise<{ success: boolean; oauthState: MCPOAuthState }> {
    return api.post(
      wsUrl(
        workspaceId,
        `/api/workspaces/mcp/servers/${serverName}/mark-authorized`,
      ),
      undefined,
      { headers: wsHeaders(workspaceId) },
    )
  }

  async clearOAuth(
    workspaceId: string,
    serverName: string,
  ): Promise<{ success: boolean }> {
    return api.delete(
      wsUrl(workspaceId, `/api/workspaces/mcp/servers/${serverName}/oauth`),
      { headers: wsHeaders(workspaceId) },
    )
  }

  // Static methods (no workspace context, uses api client for authentication)
  static async getPresets(): Promise<Record<string, MCPPreset>> {
    const data = await api.get<{ presets: MCPPreset[] }>('/api/mcp/presets')

    // Convert array to record keyed by id
    const presetsRecord: Record<string, MCPPreset> = {}
    data.presets.forEach((preset: MCPPreset) => {
      if (preset.id) {
        presetsRecord[preset.id] = preset
      }
    })
    return presetsRecord
  }

  static async addServerFromPreset(
    workspaceId: string,
    presetId: string,
    envValues: Record<string, string>,
    customName?: string,
  ): Promise<void> {
    const serverName = customName || presetId

    await api.post(
      wsUrl(
        workspaceId,
        `/api/workspaces/mcp/servers/${encodeURIComponent(serverName)}`,
      ),
      {
        preset_id: presetId,
        env: envValues,
        enabled: true,
      },
      { headers: wsHeaders(workspaceId) },
    )
  }
}
