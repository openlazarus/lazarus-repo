import * as path from 'path'
import * as fs from 'fs/promises'
import type { MCPConfiguration, MCPWorkspaceServerConfig } from '@domains/mcp/types/mcp.types'
import type { IMCPConfigManager } from './mcp-config-manager.interface'
import { getPreset } from '@infrastructure/config/mcp-presets'
import { createLogger } from '@utils/logger'
const log = createLogger('mcp-config-manager')

/** Workspace-file MCP server config (alias for shared type). */
export type MCPServerConfig = MCPWorkspaceServerConfig

export class MCPConfigManager implements IMCPConfigManager {
  /**
   * Get MCP configuration path for a workspace
   */
  private getMCPConfigPath(workspacePath: string): string {
    return path.join(workspacePath, '.mcp.config.json')
  }

  private getSDKMCPPath(workspacePath: string): string {
    return path.join(workspacePath, '.mcp.json')
  }

  /**
   * @deprecated Legacy method kept for backwards compatibility
   */
  private getUserMCPTemplatesPath(userId: string): string {
    const isProduction = process.env.NODE_ENV === 'production'
    const basePath = isProduction ? path.join(process.env.HOME || '~', 'storage') : './storage'
    return path.join(basePath, 'users', userId, 'mcp-templates.json')
  }

  /**
   * Get MCP configuration for a workspace
   */
  async getWorkspaceMCPConfig(workspacePath: string): Promise<MCPConfiguration | null> {
    const configPath = this.getMCPConfigPath(workspacePath) // .mcp.config.json
    const legacyPath = this.getSDKMCPPath(workspacePath) // .mcp.json

    try {
      await fs.access(configPath)
      const content = await fs.readFile(configPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // Migration: if .mcp.config.json doesn't exist, check for legacy .mcp.json
      try {
        await fs.access(legacyPath)
        const content = await fs.readFile(legacyPath, 'utf-8')
        const config = JSON.parse(content)
        // Write the full config to .mcp.config.json and regenerate filtered .mcp.json
        await this.saveWorkspaceMCPConfig(workspacePath, config)
        return config
      } catch {
        return null
      }
    }
  }

  /**
   * Save MCP configuration for a workspace
   */
  async saveWorkspaceMCPConfig(workspacePath: string, config: MCPConfiguration): Promise<void> {
    const configPath = this.getMCPConfigPath(workspacePath)

    // Ensure workspace directory exists
    await fs.mkdir(workspacePath, { recursive: true })

    // Write full config (source of truth with enabled flags)
    await fs.writeFile(configPath, JSON.stringify(config, null, 2))

    // Regenerate SDK-readable .mcp.json with only enabled servers
    await this.regenerateSDKMcpJson(workspacePath, config)
  }

  /**
   * Regenerate .mcp.json (SDK-readable) with only enabled servers.
   * The SDK reads this file from cwd and starts ALL servers listed,
   * so we must exclude disabled ones. For stdio servers we also inject
   * per-workspace env (WORKSPACE_PATH, LAZARUS_WORKSPACE_ID) so the MCP
   * subprocess can enforce workspace isolation on any filesystem writes.
   */
  private async regenerateSDKMcpJson(
    workspacePath: string,
    config: MCPConfiguration,
  ): Promise<void> {
    const sdkPath = this.getSDKMCPPath(workspacePath)
    const outServers: Record<string, MCPWorkspaceServerConfig> = {}
    for (const [name, server] of Object.entries(config.mcpServers || {})) {
      if (server.enabled !== false) {
        outServers[name] = this.prepareServerForSDK(server, workspacePath)
      }
    }
    const sdkConfig: MCPConfiguration = { ...config, mcpServers: outServers }
    await fs.writeFile(sdkPath, JSON.stringify(sdkConfig, null, 2))
  }

  private prepareServerForSDK(
    server: MCPWorkspaceServerConfig,
    workspacePath: string,
  ): MCPWorkspaceServerConfig {
    const refreshed = this.refreshPresetPath(server)
    return this.withWorkspaceEnv(refreshed, workspacePath)
  }

  // Re-resolves command + args from MCP_PRESETS at write time. Workspaces
  // created before preset paths were portable (commit d5f06a1) saved an
  // absolute path that no longer resolves after the AMI/runtime migration,
  // which silently breaks tool discovery in the Agent SDK.
  private refreshPresetPath(server: MCPWorkspaceServerConfig): MCPWorkspaceServerConfig {
    if (!server.preset_id) return server
    const preset = getPreset(server.preset_id)
    if (!preset) return server
    return { ...server, command: preset.command, args: preset.args }
  }

  private withWorkspaceEnv(
    server: MCPWorkspaceServerConfig,
    workspacePath: string,
  ): MCPWorkspaceServerConfig {
    const kind = server.transport ?? server.type ?? 'stdio'
    if (kind !== 'stdio') return server
    return {
      ...server,
      env: {
        ...(server.env ?? {}),
        WORKSPACE_PATH: workspacePath,
        LAZARUS_WORKSPACE_ID: path.basename(workspacePath),
      },
    }
  }

  /**
   * Update MCP servers in workspace config
   */
  async updateMCPServers(
    workspacePath: string,
    servers: Record<string, MCPServerConfig>,
  ): Promise<void> {
    const existing = await this.getWorkspaceMCPConfig(workspacePath)

    const config: MCPConfiguration = {
      ...existing,
      mcpServers: servers,
      version: '1.0',
    }

    await this.saveWorkspaceMCPConfig(workspacePath, config)
  }

  /**
   * Add or update a single MCP server
   */
  async addMCPServer(
    workspacePath: string,
    serverName: string,
    serverConfig: MCPServerConfig,
  ): Promise<void> {
    const existing = (await this.getWorkspaceMCPConfig(workspacePath)) || {
      mcpServers: {},
      version: '1.0',
    }

    if (!existing.mcpServers) existing.mcpServers = {}
    existing.mcpServers[serverName] = serverConfig

    await this.saveWorkspaceMCPConfig(workspacePath, existing)
  }

  /**
   * Remove an MCP server
   */
  async removeMCPServer(workspacePath: string, serverName: string): Promise<void> {
    const existing = await this.getWorkspaceMCPConfig(workspacePath)

    if (existing?.mcpServers?.[serverName]) {
      delete existing.mcpServers[serverName]
      await this.saveWorkspaceMCPConfig(workspacePath, existing)
    }
  }

  /**
   * Enable/disable an MCP server
   */
  async toggleMCPServer(
    workspacePath: string,
    serverName: string,
    enabled: boolean,
  ): Promise<void> {
    const existing = await this.getWorkspaceMCPConfig(workspacePath)

    if (existing?.mcpServers?.[serverName]) {
      existing.mcpServers[serverName].enabled = enabled
      await this.saveWorkspaceMCPConfig(workspacePath, existing)
    }
  }

  /**
   * Get default MCP configuration
   */
  getDefaultMCPConfig(): MCPConfiguration {
    return {
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
          transport: 'stdio',
          enabled: true,
          description: 'Filesystem access for the current workspace',
        },
      },
      version: '1.0',
      description: 'Default MCP configuration for workspace',
    }
  }

  /**
   * Initialize workspace with default MCP config if not exists
   */
  async initializeWorkspaceMCP(workspacePath: string): Promise<void> {
    const existing = await this.getWorkspaceMCPConfig(workspacePath)

    if (!existing) {
      const defaultConfig = this.getDefaultWorkspaceConfig()
      await this.saveWorkspaceMCPConfig(workspacePath, defaultConfig)
    }
  }

  /**
   * Copy MCP config from one workspace to another
   */
  async copyMCPConfig(sourceWorkspacePath: string, targetWorkspacePath: string): Promise<void> {
    const sourceConfig = await this.getWorkspaceMCPConfig(sourceWorkspacePath)

    if (sourceConfig) {
      await this.saveWorkspaceMCPConfig(targetWorkspacePath, sourceConfig)
    }
  }

  /**
   * Merge MCP configs (useful for inheriting team configs)
   */
  async mergeMCPConfigs(
    baseWorkspacePath: string,
    overrideWorkspacePath: string,
    targetWorkspacePath: string,
  ): Promise<void> {
    const baseConfig = (await this.getWorkspaceMCPConfig(baseWorkspacePath)) || { mcpServers: {} }
    const overrideConfig = (await this.getWorkspaceMCPConfig(overrideWorkspacePath)) || {
      mcpServers: {},
    }

    const mergedConfig: MCPConfiguration = {
      ...baseConfig,
      mcpServers: {
        ...baseConfig.mcpServers,
        ...overrideConfig.mcpServers,
      },
    }

    await this.saveWorkspaceMCPConfig(targetWorkspacePath, mergedConfig)
  }

  // === USER MCP TEMPLATES ===

  /**
   * Get user's MCP templates
   */
  async getUserMCPTemplates(userId: string): Promise<Record<string, MCPServerConfig>> {
    const templatesPath = this.getUserMCPTemplatesPath(userId)

    try {
      await fs.access(templatesPath)
      const content = await fs.readFile(templatesPath, 'utf-8')
      const data = JSON.parse(content)
      return data.templates || {}
    } catch {
      return {}
    }
  }

  /**
   * Save user's MCP templates
   */
  async saveUserMCPTemplates(
    userId: string,
    templates: Record<string, MCPServerConfig>,
  ): Promise<void> {
    const templatesPath = this.getUserMCPTemplatesPath(userId)

    // Ensure user directory exists
    await fs.mkdir(path.dirname(templatesPath), { recursive: true })

    const data = {
      templates,
      version: '1.0',
      updatedAt: new Date().toISOString(),
    }

    await fs.writeFile(templatesPath, JSON.stringify(data, null, 2))
  }

  /**
   * Add or update a user MCP template
   */
  async addUserMCPTemplate(
    userId: string,
    templateName: string,
    config: MCPServerConfig,
  ): Promise<void> {
    const existing = await this.getUserMCPTemplates(userId)
    existing[templateName] = config
    await this.saveUserMCPTemplates(userId, existing)
  }

  /**
   * Remove a user MCP template
   */
  async removeUserMCPTemplate(userId: string, templateName: string): Promise<void> {
    const existing = await this.getUserMCPTemplates(userId)
    delete existing[templateName]
    await this.saveUserMCPTemplates(userId, existing)
  }

  /**
   * Activate a user template in a workspace
   */
  async activateUserTemplateInWorkspace(
    userId: string,
    templateName: string,
    workspacePath: string,
    serverName?: string,
  ): Promise<void> {
    const templates = await this.getUserMCPTemplates(userId)
    const template = templates[templateName]

    if (!template) {
      throw new Error(`Template '${templateName}' not found`)
    }

    // Use provided serverName or default to templateName
    const finalServerName = serverName || templateName

    // Add to workspace with enabled: true
    await this.addMCPServer(workspacePath, finalServerName, {
      ...template,
      enabled: true,
    })
  }

  /**
   * Deactivate a template from workspace
   */
  async deactivateTemplateInWorkspace(workspacePath: string, serverName: string): Promise<void> {
    await this.removeMCPServer(workspacePath, serverName)
  }

  /**
   * Get default MCP templates (platform-level defaults)
   */
  getDefaultTemplates(): Record<string, MCPServerConfig> {
    return {
      postgres: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres'],
        transport: 'stdio',
        enabled: false,
        description: 'PostgreSQL database access',
      },
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        transport: 'stdio',
        enabled: false,
        description: 'GitHub API access',
      },
      'brave-search': {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
        transport: 'stdio',
        enabled: false,
        description: 'Brave Search API access',
      },
    }
  }

  /**
   * Initialize user with default MCP templates
   */
  async initializeUserTemplates(userId: string): Promise<void> {
    const existing = await this.getUserMCPTemplates(userId)

    if (Object.keys(existing).length === 0) {
      const defaultTemplates = this.getDefaultTemplates()
      await this.saveUserMCPTemplates(userId, defaultTemplates)
    }
  }

  // === TEMPLATE REFERENCES IN WORKSPACES ===

  /**
   * Add template reference to workspace
   */
  async addTemplateReference(
    workspacePath: string,
    referenceKey: string,
    templateName: string,
    options?: {
      serverName?: string
      enabled?: boolean
      customArgs?: string[]
      customEnv?: Record<string, string>
    },
  ): Promise<void> {
    const config = (await this.getWorkspaceMCPConfig(workspacePath)) || {
      templateReferences: {},
      version: '1.0',
    }

    if (!config.templateReferences) {
      config.templateReferences = {}
    }

    config.templateReferences[referenceKey] = {
      templateName,
      ...options,
    }

    await this.saveWorkspaceMCPConfig(workspacePath, config)
  }

  /**
   * Remove template reference from workspace
   */
  async removeTemplateReference(workspacePath: string, referenceKey: string): Promise<void> {
    const config = await this.getWorkspaceMCPConfig(workspacePath)
    if (config && config.templateReferences) {
      delete config.templateReferences[referenceKey]
      await this.saveWorkspaceMCPConfig(workspacePath, config)
    }
  }

  /**
   * Resolve template references to actual server configs
   * Uses platform default templates
   */
  async resolveTemplateReferences(workspacePath: string): Promise<Record<string, MCPServerConfig>> {
    const config = await this.getWorkspaceMCPConfig(workspacePath)
    if (!config) return {}

    const resolvedServers: Record<string, MCPServerConfig> = {}

    // Include direct server configs (legacy support)
    if (config.mcpServers) {
      Object.assign(resolvedServers, config.mcpServers)
    }

    // Resolve template references using platform defaults
    if (config.templateReferences) {
      const defaultTemplates = this.getDefaultTemplates()

      for (const [referenceKey, reference] of Object.entries(config.templateReferences)) {
        try {
          const template = defaultTemplates[reference.templateName]

          if (template) {
            const serverName = reference.serverName || referenceKey
            resolvedServers[serverName] = {
              ...template,
              // Apply overrides
              enabled: reference.enabled !== undefined ? reference.enabled : template.enabled,
              args: reference.customArgs || template.args,
              env: { ...template.env, ...reference.customEnv },
            }
          }
        } catch (error) {
          log.warn({ data: error }, `Failed to resolve template reference ${referenceKey}:`)
        }
      }
    }

    return resolvedServers
  }

  /**
   * Get workspace config with resolved templates
   */
  async getResolvedWorkspaceMCPConfig(workspacePath: string): Promise<MCPConfiguration> {
    const config = (await this.getWorkspaceMCPConfig(workspacePath)) || {
      templateReferences: {},
      version: '1.0',
    }

    const resolvedServers = await this.resolveTemplateReferences(workspacePath)

    return {
      ...config,
      mcpServers: resolvedServers,
    }
  }

  /**
   * Activate platform template in workspace (using references)
   */
  async activateTemplateReferenceInWorkspace(
    templateName: string,
    workspacePath: string,
    options?: {
      referenceKey?: string
      serverName?: string
      enabled?: boolean
      customArgs?: string[]
      customEnv?: Record<string, string>
    },
  ): Promise<void> {
    const templates = this.getDefaultTemplates()
    const template = templates[templateName]

    if (!template) {
      throw new Error(`Template '${templateName}' not found in platform defaults`)
    }

    const referenceKey = options?.referenceKey || templateName

    await this.addTemplateReference(workspacePath, referenceKey, templateName, {
      serverName: options?.serverName,
      enabled: options?.enabled !== undefined ? options.enabled : true,
      customArgs: options?.customArgs,
      customEnv: options?.customEnv,
    })
  }

  /**
   * Activate user template in workspace (using references)
   */
  async activateUserTemplateReferenceInWorkspace(
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
  ): Promise<void> {
    const templates = await this.getUserMCPTemplates(userId)
    const template = templates[templateName]

    if (!template) {
      throw new Error(`Template '${templateName}' not found`)
    }

    const referenceKey = options?.referenceKey || templateName

    await this.addTemplateReference(workspacePath, referenceKey, templateName, {
      serverName: options?.serverName,
      enabled: options?.enabled !== undefined ? options.enabled : true,
      customArgs: options?.customArgs,
      customEnv: options?.customEnv,
    })
  }

  /**
   * Get built-in MCP servers that are always available and non-removable
   */
  getBuiltInMCPs(): Record<string, MCPServerConfig & { removable: false }> {
    return {}
  }

  /**
   * Get default workspace config with template references
   */
  getDefaultWorkspaceConfig(): MCPConfiguration {
    const builtInMCPs = this.getBuiltInMCPs()

    return {
      templateReferences: {},
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
          transport: 'stdio',
          enabled: true,
          description: 'Filesystem access for the current workspace',
        },
        ...builtInMCPs,
      },
      version: '1.0',
      description: 'Default MCP configuration for workspace',
    }
  }
}

export const mcpConfigManager: IMCPConfigManager = new MCPConfigManager()
