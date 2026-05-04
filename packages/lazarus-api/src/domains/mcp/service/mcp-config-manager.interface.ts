import type { MCPConfiguration } from '@domains/mcp/types/mcp.types'
import type { MCPServerConfig } from './mcp-config-manager'

export interface IMCPConfigManager {
  /** Get MCP configuration for a workspace. */
  getWorkspaceMCPConfig(workspacePath: string): Promise<MCPConfiguration | null>

  /** Save MCP configuration for a workspace. */
  saveWorkspaceMCPConfig(workspacePath: string, config: MCPConfiguration): Promise<void>

  /** Update MCP servers in workspace config. */
  updateMCPServers(workspacePath: string, servers: Record<string, MCPServerConfig>): Promise<void>

  /** Add or update a single MCP server. */
  addMCPServer(
    workspacePath: string,
    serverName: string,
    serverConfig: MCPServerConfig,
  ): Promise<void>

  /** Remove an MCP server. */
  removeMCPServer(workspacePath: string, serverName: string): Promise<void>

  /** Enable or disable an MCP server. */
  toggleMCPServer(workspacePath: string, serverName: string, enabled: boolean): Promise<void>

  /** Get default MCP configuration. */
  getDefaultMCPConfig(): MCPConfiguration

  /** Initialize workspace with default MCP config if not exists. */
  initializeWorkspaceMCP(workspacePath: string): Promise<void>

  /** Copy MCP config from one workspace to another. */
  copyMCPConfig(sourceWorkspacePath: string, targetWorkspacePath: string): Promise<void>

  /** Merge MCP configs (useful for inheriting team configs). */
  mergeMCPConfigs(
    baseWorkspacePath: string,
    overrideWorkspacePath: string,
    targetWorkspacePath: string,
  ): Promise<void>

  /** Get user's MCP templates. */
  getUserMCPTemplates(userId: string): Promise<Record<string, MCPServerConfig>>

  /** Save user's MCP templates. */
  saveUserMCPTemplates(userId: string, templates: Record<string, MCPServerConfig>): Promise<void>

  /** Add or update a user MCP template. */
  addUserMCPTemplate(userId: string, templateName: string, config: MCPServerConfig): Promise<void>

  /** Remove a user MCP template. */
  removeUserMCPTemplate(userId: string, templateName: string): Promise<void>

  /** Activate a user template in a workspace. */
  activateUserTemplateInWorkspace(
    userId: string,
    templateName: string,
    workspacePath: string,
    serverName?: string,
  ): Promise<void>

  /** Deactivate a template from workspace. */
  deactivateTemplateInWorkspace(workspacePath: string, serverName: string): Promise<void>

  /** Get default MCP templates (platform-level defaults). */
  getDefaultTemplates(): Record<string, MCPServerConfig>

  /** Initialize user with default MCP templates. */
  initializeUserTemplates(userId: string): Promise<void>

  /** Add template reference to workspace. */
  addTemplateReference(
    workspacePath: string,
    referenceKey: string,
    templateName: string,
    options?: {
      serverName?: string
      enabled?: boolean
      customArgs?: string[]
      customEnv?: Record<string, string>
    },
  ): Promise<void>

  /** Remove template reference from workspace. */
  removeTemplateReference(workspacePath: string, referenceKey: string): Promise<void>

  /** Resolve template references to actual server configs. */
  resolveTemplateReferences(workspacePath: string): Promise<Record<string, MCPServerConfig>>

  /** Get workspace config with resolved templates. */
  getResolvedWorkspaceMCPConfig(workspacePath: string): Promise<MCPConfiguration>

  /** Activate platform template in workspace (using references). */
  activateTemplateReferenceInWorkspace(
    templateName: string,
    workspacePath: string,
    options?: {
      referenceKey?: string
      serverName?: string
      enabled?: boolean
      customArgs?: string[]
      customEnv?: Record<string, string>
    },
  ): Promise<void>

  /** Activate user template in workspace (using references). */
  activateUserTemplateReferenceInWorkspace(
    userId: string,
    templateName: string,
    workspacePath: string,
    options?: {
      referenceKey?: string
      serverName?: string
      enabled?: boolean
      customArgs?: string[]
      customEnv?: Record<string, string>
    },
  ): Promise<void>

  /** Get built-in MCP servers that are always available. */
  getBuiltInMCPs(): Record<string, MCPServerConfig & { removable: false }>

  /** Get default workspace config with template references. */
  getDefaultWorkspaceConfig(): MCPConfiguration
}
