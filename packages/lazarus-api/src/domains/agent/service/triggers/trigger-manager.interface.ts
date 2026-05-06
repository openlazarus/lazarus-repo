import type {
  AgentTrigger,
  TriggerExecution,
  ExternalTriggerPayload,
} from '@domains/agent/types/trigger.types'

export interface IAgentTriggerManager {
  /** Create a new trigger. */
  createTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    trigger: Omit<
      AgentTrigger,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'triggerCount'
      | 'status'
      | 'workspaceId'
      | 'userId'
      | 'agentId'
    >,
  ): Promise<AgentTrigger>

  /** Update an existing trigger. */
  updateTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    updates: Partial<AgentTrigger>,
  ): Promise<AgentTrigger | null>

  /** Delete a trigger. */
  deleteTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
  ): Promise<void>

  /** Get trigger by ID. */
  getTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
  ): Promise<AgentTrigger | null>

  /** List triggers for an agent. */
  listTriggers(workspaceId: string, userId: string, agentId: string): Promise<AgentTrigger[]>

  /** Alias for listTriggers (backwards compatibility). */
  getTriggersForAgent(workspaceId: string, userId: string, agentId: string): Promise<AgentTrigger[]>

  /** Get trigger execution history. */
  getTriggerExecutions(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    limit?: number,
  ): Promise<TriggerExecution[]>

  /** Execute a trigger manually. */
  executeTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    triggerData?: any,
  ): Promise<TriggerExecution>

  /** Execute an agent-local trigger that has already been loaded. */
  executeAgentTrigger(
    trigger: AgentTrigger,
    triggerData?: any,
    existingActivityLogId?: string,
  ): Promise<TriggerExecution>

  /** Handle external trigger payload. */
  handleExternalTrigger(payload: ExternalTriggerPayload): Promise<TriggerExecution | null>

  /** Get execution history for a trigger. */
  getExecutionHistory(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    limit?: number,
  ): Promise<TriggerExecution[]>

  /** Load and schedule triggers for a specific agent. */
  loadAndScheduleTriggersForAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<void>

  /** Check and execute email trigger (used by backup polling). */
  checkAndExecuteEmailTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
  ): Promise<void>
}
