import type { MCPServerConfig } from '@domains/mcp/service/mcp-config-manager'
import type { Workspace, MCPWorkspaceConfig } from '@domains/workspace/types/workspace.types'

export interface IMCPWorkspaceManager {
  /** Get the full storage path for a team. */
  getTeamPath(teamId: string): string

  /** Get the full storage path for an agent. */
  getAgentPath(teamId: string, agentId: string): string

  /** Load MCP configuration for a workspace. */
  loadWorkspaceMCPConfig(workspace: Workspace): Promise<MCPWorkspaceConfig | null>

  /** Save MCP configuration for a workspace. */
  saveWorkspaceMCPConfig(workspace: Workspace, config: MCPWorkspaceConfig): Promise<void>

  /** Get team-level MCP servers. */
  getTeamMCPServers(teamId: string): Promise<Record<string, MCPServerConfig>>

  /** Get default MCP servers. */
  getDefaultMCPServers(): Record<string, MCPServerConfig>

  /** Build complete MCP configuration for a workspace. */
  buildWorkspaceMCPConfig(
    workspace: Workspace,
    includeTeamServers?: boolean,
  ): Promise<MCPWorkspaceConfig>

  /** Generate temporary MCP config file for Claude Code SDK. */
  generateTempMCPConfig(workspace: Workspace): Promise<string>

  /** Create workspace structure with proper paths. */
  createWorkspaceStructure(
    type: 'team' | 'agent',
    ownerId: string,
    teamId: string,
    name: string,
    additionalPaths?: string[],
  ): Promise<Workspace>

  /** Create workspace for data analyst agent. */
  createAgentWorkspaceWithDataAccess(agentId: string, teamId: string): Promise<Workspace>
}
