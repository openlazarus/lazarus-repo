/**
 * MCP server entry shape in workspace `.mcp.config.json` and user templates.
 * Distinct from `MCPServerConfig` in `types/index.ts` (OAuth, icons, etc.).
 */
export interface MCPWorkspaceServerConfig {
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
  type?: 'stdio' | 'http' | 'sse'
  transport?: 'stdio' | 'http' | 'sse'
  enabled?: boolean
  description?: string
  category?: string
  icon?: string
  preset_id?: string
}

export interface MCPServerReference {
  templateName: string
  serverName?: string
  enabled?: boolean
  customArgs?: string[]
  customEnv?: Record<string, string>
}

export interface MCPConfiguration {
  mcpServers?: Record<string, MCPWorkspaceServerConfig>
  templateReferences?: Record<string, MCPServerReference>
  version?: string
  description?: string
}
