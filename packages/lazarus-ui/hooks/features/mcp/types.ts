export type EnvVariable = {
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

export type MCPOAuthState = {
  status: 'not_required' | 'pending' | 'authorized' | 'expired' | 'error'
  authorizationUrl?: string
  error?: string
  expiresAt?: string
  authorizedAt?: string
}

export type MCPPreset = {
  id?: string
  name: string
  description: string
  icon: string
  category: string
  command: string
  args: string[]
  transport?: 'stdio' | 'http' | 'sse'
  env_schema: Record<string, EnvVariable>
  authType?: MCPAuthType
  requiresOAuth?: boolean
  authInstructions?: string
}

export type MCPServer = {
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
  requiresOAuth?: boolean
  oauthState?: MCPOAuthState
  authInstructions?: string
}

export type MCPTool = {
  name: string
  description?: string
  inputSchema?: { type: string; properties?: Record<string, any> }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export type MCPResource = {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export type ConnectionTestResult = {
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
  requiresOAuth?: boolean
  oauthState?: MCPOAuthState
  authInstructions?: string
  credentialsValid?: boolean
  credentialsError?: string
  validationTool?: string
}

export type OAuthStatusResult = {
  requiresOAuth: boolean
  oauthState: MCPOAuthState
  authInstructions?: string
}

export type InitiateOAuthResult = {
  authorizationUrl?: string
  oauthState: MCPOAuthState
  authInstructions?: string
  error?: string
}

export type MCPSourcesResponse = {
  availableServers: Array<{
    name: string
    enabled: boolean
    enabledInWorkspace: boolean
    description?: string
    icon?: string
    category?: string
  }>
  enabledInWorkspace: string[]
}

export type MCPPresetsResponse = {
  presets: MCPPreset[]
}
