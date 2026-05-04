import type { AgentConfig, AgentInstance } from './config-manager'

export interface IAgentConfigManager {
  /** Initialize config, instances, and templates directories. */
  initialize(): Promise<void>

  /** Save an agent configuration. */
  saveAgentConfig(config: AgentConfig): Promise<void>

  /** Load an agent configuration by ID. */
  loadAgentConfig(configId: string): Promise<AgentConfig | null>

  /** List all agent configurations. */
  listAgentConfigs(): Promise<AgentConfig[]>

  /** Create a new agent instance from a config. */
  createAgentInstance(configId: string, userId: string, teamId?: string): Promise<AgentInstance>

  /** Load an existing agent instance. */
  loadAgentInstance(instanceId: string): Promise<AgentInstance | null>

  /** Update the status of an agent instance. */
  updateInstanceStatus(instanceId: string, status: AgentInstance['status']): Promise<void>

  /** Update the context of an agent instance. */
  updateInstanceContext(instanceId: string, context: Record<string, any>): Promise<void>

  /** Get workspace path for an instance. */
  getWorkspacePath(instanceId: string): Promise<string>

  /** Save a file to an instance's workspace. */
  saveWorkspaceFile(instanceId: string, filename: string, content: string): Promise<void>

  /** Load a file from an instance's workspace. */
  loadWorkspaceFile(instanceId: string, filename: string): Promise<any>

  /** Create default agent templates. */
  createDefaultTemplates(): Promise<void>

  /** List active instances for a user. */
  listUserInstances(userId: string): Promise<AgentInstance[]>

  /** Get MCP configuration for an instance. */
  getMCPConfig(instanceId: string): Promise<Record<string, any>>
}
