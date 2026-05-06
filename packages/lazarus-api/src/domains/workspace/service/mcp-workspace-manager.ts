import * as path from 'path'
import * as fs from 'fs/promises'
import { mcpConfigManager, type MCPServerConfig } from '@domains/mcp/service/mcp-config-manager'
import type { Workspace, MCPWorkspaceConfig } from '@domains/workspace/types/workspace.types'
import type { IMCPWorkspaceManager } from './mcp-workspace-manager.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('mcp-workspace-manager')

type WorkspaceStructureKind = 'team' | 'agent'

const WORKSPACE_STRUCTURE_RESOLVERS: Record<
  WorkspaceStructureKind,
  (
    manager: MCPWorkspaceManager,
    ownerId: string,
    teamId: string,
  ) => { workspaceId: string; workspacePath: string }
> = {
  agent: (manager, ownerId, teamId) => ({
    workspaceId: `agent-${ownerId}`,
    workspacePath: path.join(manager.getAgentPath(teamId, ownerId), 'workspace'),
  }),
  team: (_manager, _ownerId, teamId) => ({
    workspaceId: `team-${teamId}-workspace`,
    workspacePath: path.join(_manager.getTeamPath(teamId), 'workspace'),
  }),
}

export class MCPWorkspaceManager implements IMCPWorkspaceManager {
  private basePath: string
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.basePath = this.isProduction ? path.join(process.env.HOME || '~', 'storage') : './storage'
  }

  /**
   * Get the full storage path for a team
   */
  getTeamPath(teamId: string): string {
    return path.join(this.basePath, 'lazarus', teamId)
  }

  /**
   * Get the full storage path for an agent
   * All agents are team-based
   */
  getAgentPath(teamId: string, agentId: string): string {
    // All agents are stored at team level
    return path.join(this.getTeamPath(teamId), 'agents', agentId)
  }

  /**
   * Load MCP configuration for a workspace
   */
  async loadWorkspaceMCPConfig(workspace: Workspace): Promise<MCPWorkspaceConfig | null> {
    try {
      const mcpPath = path.join(workspace.path, '.mcp.config.json')
      const content = await fs.readFile(mcpPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * Save MCP configuration for a workspace
   */
  async saveWorkspaceMCPConfig(workspace: Workspace, config: MCPWorkspaceConfig): Promise<void> {
    const mcpPath = path.join(workspace.path, '.mcp.config.json')
    await fs.writeFile(mcpPath, JSON.stringify(config, null, 2))
  }

  /**
   * Get team-level MCP servers
   */
  async getTeamMCPServers(teamId: string): Promise<Record<string, MCPServerConfig>> {
    const teamToolsPath = path.join(this.getTeamPath(teamId), 'tools')
    const servers: Record<string, MCPServerConfig> = {}

    try {
      await fs.mkdir(teamToolsPath, { recursive: true })
      const tools = await fs.readdir(teamToolsPath)

      for (const tool of tools) {
        const toolPath = path.join(teamToolsPath, tool)
        const stat = await fs.stat(toolPath)

        if (stat.isDirectory()) {
          // Check if tool has MCP config
          const mcpConfigPath = path.join(toolPath, 'mcp.json')
          try {
            const config = await fs.readFile(mcpConfigPath, 'utf-8')
            const mcpConfig = JSON.parse(config)
            servers[tool] = mcpConfig
          } catch {
            // Tool doesn't have MCP config, create default
            servers[tool] = {
              command: 'node',
              args: [path.join(toolPath, 'index.js')],
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'Error loading team MCP servers')
    }

    return servers
  }

  /**
   * Get default MCP servers
   */
  getDefaultMCPServers(): Record<string, MCPServerConfig> {
    return {
      filesystem: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
        enabled: true,
      },
      postgres: {
        command: 'npx',
        args: [
          '-y',
          '@modelcontextprotocol/server-postgres',
          process.env.DATABASE_URL || 'postgresql://localhost/lazarus',
        ],
        enabled: false,
      },
      git: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-git'],
        enabled: false,
      },
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
        },
        enabled: false,
      },
    }
  }

  /**
   * Build complete MCP configuration for a workspace
   * Uses mcpConfigManager for the authoritative source of enabled/disabled state
   */
  async buildWorkspaceMCPConfig(
    workspace: Workspace,
    includeTeamServers: boolean = true,
  ): Promise<MCPWorkspaceConfig> {
    const config: MCPWorkspaceConfig = {
      mcpServers: {},
    }

    // Primary source: Use mcpConfigManager to get the resolved workspace config
    // This includes servers added via UI and their enabled/disabled state
    try {
      const resolvedConfig = await mcpConfigManager.getResolvedWorkspaceMCPConfig(workspace.path)
      const builtInMCPs = mcpConfigManager.getBuiltInMCPs()

      // Add built-in MCPs that are enabled
      for (const [serverName, serverConfig] of Object.entries(builtInMCPs)) {
        if (serverConfig.enabled !== false) {
          config.mcpServers[serverName] = serverConfig
        }
      }

      // Add workspace MCPs that are enabled (these override built-ins)
      if (resolvedConfig.mcpServers) {
        for (const [serverName, serverConfig] of Object.entries(resolvedConfig.mcpServers)) {
          if (serverConfig.enabled !== false) {
            config.mcpServers[serverName] = serverConfig
          }
        }
      }

      log.info(
        `Loaded ${Object.keys(config.mcpServers).length} enabled MCP servers for workspace ${workspace.id}`,
      )
    } catch (error) {
      log.warn({ data: error }, 'Failed to load from mcpConfigManager, falling back to defaults')

      // Fallback: Start with default servers
      const defaultServers = this.getDefaultMCPServers()
      for (const [serverName, serverConfig] of Object.entries(defaultServers)) {
        if (serverConfig.enabled !== false) {
          config.mcpServers[serverName] = serverConfig
        }
      }
    }

    // Add team-level servers if requested
    if (includeTeamServers && workspace.teamId) {
      const teamServers = await this.getTeamMCPServers(workspace.teamId)
      Object.assign(config.mcpServers, teamServers)
    }

    // Update filesystem server to include all workspace paths
    if (config.mcpServers.filesystem) {
      const paths = [workspace.path]
      if (workspace.additionalPaths) {
        paths.push(...workspace.additionalPaths)
      }

      // Update filesystem server to include all paths
      config.mcpServers.filesystem = {
        ...config.mcpServers.filesystem,
        args: ['-y', '@modelcontextprotocol/server-filesystem', ...paths],
      }
    }

    return config
  }

  /**
   * Generate temporary MCP config file for Claude Code SDK
   */
  async generateTempMCPConfig(workspace: Workspace): Promise<string> {
    const config = await this.buildWorkspaceMCPConfig(workspace)

    // Create temp file
    const tempDir = path.join('/tmp', 'mcp-configs')
    await fs.mkdir(tempDir, { recursive: true })

    const tempPath = path.join(tempDir, `mcp-${workspace.id}-${Date.now()}.json`)
    await fs.writeFile(tempPath, JSON.stringify(config, null, 2))

    return tempPath
  }

  /**
   * Create workspace structure with proper paths
   * All workspaces are team-based
   */
  async createWorkspaceStructure(
    type: 'team' | 'agent',
    ownerId: string,
    teamId: string,
    name: string,
    additionalPaths?: string[],
  ): Promise<Workspace> {
    const resolver = WORKSPACE_STRUCTURE_RESOLVERS[type as WorkspaceStructureKind]
    if (!resolver) {
      throw new Error(`Invalid workspace type: ${type}`)
    }
    const { workspaceId, workspacePath } = resolver(this, ownerId, teamId)

    // Ensure workspace directory exists
    await fs.mkdir(workspacePath, { recursive: true })

    // Build additional paths with full paths
    const fullAdditionalPaths = additionalPaths?.map((p) => {
      if (path.isAbsolute(p)) return p
      // Relative to team workspace
      return path.join(this.getTeamPath(teamId), 'workspace', p)
    })

    const workspace: Workspace = {
      id: workspaceId,
      name,
      path: workspacePath,
      additionalPaths: fullAdditionalPaths,
      type,
      ownerId,
      teamId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Save workspace metadata
    const metadataPath = path.join(workspacePath, '.workspace.json')
    await fs.writeFile(metadataPath, JSON.stringify(workspace, null, 2))

    return workspace
  }

  /**
   * Example: Create workspace for data analyst agent
   */
  async createAgentWorkspaceWithDataAccess(agentId: string, teamId: string): Promise<Workspace> {
    return this.createWorkspaceStructure('agent', agentId, teamId, 'Data Analyst Workspace', [
      'sales/files',
      'accounting',
      'finance',
    ])
  }
}
