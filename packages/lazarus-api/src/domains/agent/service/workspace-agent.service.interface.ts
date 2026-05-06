import type { WorkspaceAgentConfig } from '@domains/agent/types/agent.types'

export interface IWorkspaceAgentService {
  /** Create a new agent in workspace. */
  createAgent(
    workspaceId: string,
    userId: string,
    agent: Omit<WorkspaceAgentConfig, 'metadata' | 'enabled'> & { enabled?: boolean },
    autoTriggerEmail?: boolean,
    restrictEmailToMembers?: boolean,
  ): Promise<WorkspaceAgentConfig>

  /** Update an existing agent. */
  updateAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
    updates: Partial<WorkspaceAgentConfig>,
  ): Promise<WorkspaceAgentConfig>

  /** Connect WhatsApp to an agent. */
  connectWhatsApp(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<{ triggerCreated: boolean }>

  /** Get agent configuration. */
  getAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<WorkspaceAgentConfig | null>

  /** Update email addresses for all agents when workspace slug changes. */
  updateAgentEmails(workspaceId: string, userId: string, newSlug: string): Promise<number>

  /** List all agents in a workspace. */
  listAgents(
    workspaceId: string,
    userId: string,
    includeSystem?: boolean,
  ): Promise<WorkspaceAgentConfig[]>

  /** Delete an agent from workspace. */
  deleteAgent(workspaceId: string, userId: string, agentId: string): Promise<boolean>

  /** List agent's personal files. */
  listAgentFiles(
    workspaceId: string,
    userId: string,
    agentId: string,
    relativePath?: string,
  ): Promise<{ name: string; path: string; type: 'file' | 'directory' }[]>

  /** Initialize system agents in a workspace based on template. */
  initializeSystemAgents(workspaceId: string, userId: string, templateId?: string): Promise<void>

  /** Create an agent from a template. */
  createAgentFromTemplate(
    workspacePath: string,
    agentTemplateId: string,
    userId: string,
  ): Promise<WorkspaceAgentConfig>
}
