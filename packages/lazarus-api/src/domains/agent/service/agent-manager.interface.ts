import type { AgentConfig, AgentInstance } from './agent-manager'

export interface IAgentManager {
  /** Initialize global templates directory. */
  initialize(): Promise<void>

  /** Save an agent configuration. */
  saveAgentConfig(config: AgentConfig, userId: string, teamId?: string): Promise<void>

  /** Load an agent configuration by ID. */
  loadAgentConfig(configId: string, userId: string, teamId?: string): Promise<AgentConfig | null>

  /** List all agent configurations for a user. */
  listAgentConfigs(userId: string, teamId?: string): Promise<AgentConfig[]>

  /** List agents for a specific workspace. */
  getAgentsByWorkspace(workspaceId: string, userId: string, teamId?: string): Promise<AgentConfig[]>

  /** Create a new agent instance from a config. */
  createAgentInstance(configId: string, userId: string, teamId?: string): Promise<AgentInstance>

  /** Load an existing agent instance. */
  loadAgentInstance(
    instanceId: string,
    userId: string,
    teamId?: string,
  ): Promise<AgentInstance | null>

  /** Update the status of an agent instance. */
  updateInstanceStatus(
    instanceId: string,
    userId: string,
    status: AgentInstance['status'],
    teamId?: string,
  ): Promise<void>

  /** Update the context of an agent instance. */
  updateInstanceContext(
    instanceId: string,
    userId: string,
    context: Record<string, any>,
    teamId?: string,
  ): Promise<void>

  /** List active instances for a user. */
  listUserInstances(userId: string, teamId?: string): Promise<AgentInstance[]>

  /** Save a file to an agent instance's workspace. */
  saveWorkspaceFile(
    instanceId: string,
    userId: string,
    filename: string,
    content: string,
    teamId?: string,
  ): Promise<void>

  /** Load a file from an agent instance's workspace. */
  loadWorkspaceFile(
    instanceId: string,
    userId: string,
    filename: string,
    teamId?: string,
  ): Promise<any>

  /** Get MCP configuration for an instance. */
  getMCPConfig(instanceId: string, userId: string, teamId?: string): Promise<Record<string, any>>

  /** Create global agent templates. */
  createGlobalTemplates(): Promise<void>
}
