import * as path from 'path'
import * as fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type {
  AgentTrigger,
  TriggerExecution,
  ExternalTriggerPayload,
  TriggerLog,
  EmailTriggerConfig,
} from '@domains/agent/types/trigger.types'
import { WorkspaceAgentExecutor } from '@domains/agent/service/workspace-agent-executor'
import { MAX_TURNS } from '@infrastructure/config/max-turns'
import { realtime } from '@realtime'
import { WorkspaceManager } from '@domains/workspace/service/workspace-manager'
import { buildTriggerPrompt } from './prompt-builders'
import { executionQueue } from '@domains/execution/service/execution-queue'
import { queuePersistence } from '@domains/execution/repository/queue-persistence'
import type { IAgentTriggerManager } from './trigger-manager.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('trigger-manager')

const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
}

/**
 * Agent Trigger Manager
 * Handles creation, execution, and management of agent triggers
 */
export class AgentTriggerManager implements IAgentTriggerManager {
  private workspaceManager: WorkspaceManager
  private agentExecutor: WorkspaceAgentExecutor
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map()

  constructor(executor?: WorkspaceAgentExecutor) {
    this.workspaceManager = new WorkspaceManager()
    this.agentExecutor = executor || new WorkspaceAgentExecutor()
  }

  /**
   * Get the triggers directory path for a specific agent in a workspace
   */
  private async getAgentTriggersPath(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<string> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found or user ${userId} does not have access`)
    }
    return path.join(workspace.path, '.agents', agentId, 'triggers')
  }

  /**
   * Get the executions directory path for a specific agent in a workspace
   */
  private async getAgentExecutionsPath(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<string> {
    const workspace = await this.workspaceManager.getWorkspace(workspaceId, userId)
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found or user ${userId} does not have access`)
    }
    return path.join(workspace.path, '.agents', agentId, 'executions')
  }

  /**
   * Create a new trigger
   */
  async createTrigger(
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
  ): Promise<AgentTrigger> {
    const fullTrigger: AgentTrigger = {
      ...trigger,
      id: uuidv4(),
      workspaceId,
      userId,
      agentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      triggerCount: 0,
      status: 'active',
    }

    await this.saveTrigger(fullTrigger)

    // Schedule if it's a scheduled trigger
    if (fullTrigger.type === 'scheduled' && fullTrigger.enabled) {
      await this.scheduleTrigger(fullTrigger)
    }

    // Set up email monitoring if it's an email trigger
    if (fullTrigger.type === 'email' && fullTrigger.enabled) {
      await this.setupEmailTrigger(fullTrigger)
    }

    return fullTrigger
  }

  /**
   * Update an existing trigger
   */
  async updateTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    updates: Partial<AgentTrigger>,
  ): Promise<AgentTrigger | null> {
    const trigger = await this.getTrigger(workspaceId, userId, agentId, triggerId)
    if (!trigger) return null

    const updatedTrigger: AgentTrigger = {
      ...trigger,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.saveTrigger(updatedTrigger)

    // Reschedule if needed
    if (updatedTrigger.type === 'scheduled') {
      this.unscheduleTrigger(triggerId)
      if (updatedTrigger.enabled) {
        await this.scheduleTrigger(updatedTrigger)
      }
    }

    return updatedTrigger
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
  ): Promise<void> {
    this.unscheduleTrigger(triggerId)

    const triggersPath = await this.getAgentTriggersPath(workspaceId, userId, agentId)
    const triggerPath = path.join(triggersPath, `${triggerId}.json`)
    await fs.unlink(triggerPath).catch(() => {}) // Ignore if doesn't exist
  }

  /**
   * Get trigger by ID
   */
  async getTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
  ): Promise<AgentTrigger | null> {
    const triggersPath = await this.getAgentTriggersPath(workspaceId, userId, agentId)
    const triggerPath = path.join(triggersPath, `${triggerId}.json`)

    try {
      const content = await fs.readFile(triggerPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * List triggers for an agent (workspace-scoped)
   */
  async listTriggers(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<AgentTrigger[]> {
    const triggersPath = await this.getAgentTriggersPath(workspaceId, userId, agentId)

    try {
      // Ensure directory exists
      await fs.mkdir(triggersPath, { recursive: true })

      const files = await fs.readdir(triggersPath)
      const triggers: AgentTrigger[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(triggersPath, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const trigger = JSON.parse(content)

          // Heal-on-read: fix embedded IDs if they don't match filesystem location
          let healed = false
          if (trigger.workspaceId !== workspaceId) {
            trigger.workspaceId = workspaceId
            healed = true
          }
          if (trigger.agentId !== agentId) {
            trigger.agentId = agentId
            healed = true
          }
          if (healed) {
            log.info(`Healed trigger ${trigger.id}: fixed workspaceId/agentId to match filesystem`)
            await fs.writeFile(filePath, JSON.stringify(trigger, null, 2)).catch(() => {})
          }

          triggers.push(trigger)
        }
      }

      return triggers.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } catch {
      return []
    }
  }

  /**
   * Alias for backwards compatibility - list triggers for an agent
   */
  async getTriggersForAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<AgentTrigger[]> {
    return this.listTriggers(workspaceId, userId, agentId)
  }

  /**
   * Get alias for getTriggerExecutions to match API expectations
   */
  async getTriggerExecutions(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    limit: number = 50,
  ): Promise<TriggerExecution[]> {
    return this.getExecutionHistory(workspaceId, userId, agentId, triggerId, limit)
  }

  /**
   * Execute a trigger manually
   */
  async executeTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    triggerData?: any,
  ): Promise<TriggerExecution> {
    const trigger = await this.getTrigger(workspaceId, userId, agentId, triggerId)
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`)
    }

    // Pass requesting userId so manual runs are attributed to the person who clicked "Run",
    // not the trigger creator. Scheduled/email triggers don't call this method.
    return await this.runTriggerExecution(trigger, triggerData, userId)
  }

  /**
   * Execute an agent-local trigger that has already been loaded
   * Used for triggers stored in agent directories (e.g., .agents/{agentId}/triggers.json)
   * This is a simplified execution that doesn't persist to centralized storage
   * @param trigger The trigger configuration
   * @param triggerData Data to pass to the trigger execution
   * @param existingActivityLogId Optional - if provided, reuses existing activity log instead of creating a new one
   */
  async executeAgentTrigger(
    trigger: AgentTrigger,
    triggerData?: any,
    existingActivityLogId?: string,
  ): Promise<TriggerExecution> {
    if (!trigger) {
      throw new Error('Trigger object is required')
    }

    const execution: TriggerExecution = {
      id: uuidv4(),
      triggerId: trigger.id,
      agentId: trigger.agentId,
      sessionId: uuidv4(),
      status: 'pending',
      startedAt: new Date().toISOString(),
      triggerData,
      logs: [],
    }

    // Queue everything except interactive channels (email, whatsapp, discord, slack).
    if (!AgentTriggerManager.UNQUEUED_TRIGGER_TYPES.has(trigger.type)) {
      await queuePersistence
        .save({
          executionId: execution.id,
          agentId: trigger.agentId,
          workspaceId: trigger.workspaceId,
          userId: trigger.userId,
          triggerId: trigger.id,
          triggerType: trigger.type,
          triggerName: trigger.name || trigger.id,
          triggerData,
          persistedAt: new Date().toISOString(),
          state: 'queued',
        })
        .catch((err) => log.error('Failed to persist queue task:', err))

      const queueResult = await executionQueue.withSlot(
        { executionId: execution.id, agentId: trigger.agentId, workspaceId: trigger.workspaceId },
        () => this.executeAgentTriggerInner(trigger, execution, triggerData, existingActivityLogId),
      )

      const skipInfo = AgentTriggerManager.QUEUE_SKIP_MAP[queueResult.status]
      if (skipInfo) {
        log.info(`Queue ${queueResult.status}: trigger ${trigger.id} for agent ${trigger.agentId}`)
        execution.status = skipInfo.status
        execution.completedAt = new Date().toISOString()
        execution.error = skipInfo.error
        return execution
      }

      return (queueResult as { status: 'executed'; value: TriggerExecution }).value
    }

    // Interactive triggers: execute directly without queue
    return this.executeAgentTriggerInner(trigger, execution, triggerData, existingActivityLogId)
  }

  /**
   * Inner implementation of executeAgentTrigger. Separated so webhook triggers
   * can be wrapped with the execution queue while other types run directly.
   */
  private async executeAgentTriggerInner(
    trigger: AgentTrigger,
    execution: TriggerExecution,
    triggerData?: any,
    existingActivityLogId?: string,
  ): Promise<TriggerExecution> {
    try {
      execution.status = 'running'

      // Build execution title and description from trigger data
      // task can be at top level or inside config (depending on how trigger was created)
      const triggerTask =
        trigger.task ||
        ('task' in trigger.config
          ? ((trigger.config as Record<string, unknown>).task as string)
          : undefined)

      // Delegate prompt building to platform-specific builders
      const promptResult = await buildTriggerPrompt(trigger, triggerData, triggerTask)
      const { prompt, platformSource, conversationTitle } = promptResult

      const executionTitle = promptResult.executionTitle || trigger.name || 'Trigger execution'
      const executionDescription =
        promptResult.executionDescription || triggerTask || 'Execute triggered task'

      // Register execution in cache with full metadata using new realtime API
      realtime.trackExecution({
        id: execution.id,
        type: 'trigger',
        agentId: trigger.agentId,
        userId: trigger.userId,
        workspaceId: trigger.workspaceId,
        status: 'running',
        metadata: {
          triggerId: trigger.id,
          title: executionTitle,
          description: executionDescription,
          ...promptResult.trackerMetadata, // e.g. emailContext for frontend
          triggerType: trigger.type,
          triggerName: trigger.name,
        },
      })

      log.info(
        `Executing agent-local trigger ${trigger.id} for agent ${trigger.agentId} (type=${trigger.type})`,
      )

      // Execute the agent (pass executionId to avoid double-registration)
      const result = await this.agentExecutor.executeAgent({
        agentId: trigger.agentId,
        workspaceId: trigger.workspaceId,
        userId: trigger.userId,
        task: prompt,
        maxTurns: MAX_TURNS.triggers,
        executionId: execution.id, // Pass existing execution ID
        // Platform integration for activity logging
        platformSource,
        conversationTitle: conversationTitle ?? trigger.name,
        userMessage: promptResult.userMessage,
        platformMetadata: promptResult.platformMetadata,
        // Pass existing activity log ID to avoid creating duplicate logs
        existingActivityLogId,
      })

      // Executor already updated the execution cache (fail/complete).
      // Check the SDK result to determine if execution actually failed.
      const sdkResult = (result as any)?.result
      const sdkFailed =
        sdkResult?.is_error === true || (sdkResult?.subtype && sdkResult.subtype !== 'success')

      execution.result = result
      execution.completedAt = new Date().toISOString()

      if (sdkFailed) {
        execution.status = 'failed'
        execution.error = this.formatSdkError(sdkResult?.subtype, sdkResult)
        log.info(`Agent-local trigger ${trigger.id} failed: ${execution.error}`)
      } else {
        execution.status = 'completed'
        log.info(`Agent-local trigger ${trigger.id} completed successfully`)
      }
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date().toISOString()
      log.error({ err: error }, `Agent-local trigger ${trigger.id} failed:`)
    }

    // Send failure email notification — skip for user cancellations
    if (execution.status === 'failed' && !execution.error?.includes('Cancelled by user')) {
      this.notifyTriggerFailure(trigger, execution.error!)
    }

    return execution
  }

  /**
   * Handle external trigger payload
   * Note: This method is for external webhooks that don't have workspace context upfront.
   * It needs to load the trigger first to get workspace/agent information.
   */
  async handleExternalTrigger(_payload: ExternalTriggerPayload): Promise<TriggerExecution | null> {
    // For external triggers, we need to scan for the trigger across workspaces
    // This is less efficient but necessary for webhook endpoints that only have triggerId
    // TODO: Consider maintaining a trigger ID -> workspace/agent mapping for faster lookups
    throw new Error(
      'handleExternalTrigger needs workspace/agent context - use executeTrigger instead',
    )
  }

  /**
   * Get execution history for a trigger
   */
  async getExecutionHistory(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
    limit: number = 50,
  ): Promise<TriggerExecution[]> {
    const executionsPath = await this.getAgentExecutionsPath(workspaceId, userId, agentId)

    try {
      // Ensure directory exists
      await fs.mkdir(executionsPath, { recursive: true })

      const files = await fs.readdir(executionsPath)
      const executions: TriggerExecution[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(executionsPath, file), 'utf-8')
          const execution = JSON.parse(content)

          // Filter by triggerId
          if (execution.triggerId === triggerId) {
            executions.push(execution)
          }
        }
      }

      return executions
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, limit)
    } catch {
      return []
    }
  }

  // Private methods

  private async saveTrigger(trigger: AgentTrigger): Promise<void> {
    const triggersPath = await this.getAgentTriggersPath(
      trigger.workspaceId,
      trigger.userId,
      trigger.agentId,
    )

    // Ensure directory exists
    await fs.mkdir(triggersPath, { recursive: true })

    const triggerPath = path.join(triggersPath, `${trigger.id}.json`)
    await fs.writeFile(triggerPath, JSON.stringify(trigger, null, 2))
  }

  /**
   * Load and schedule triggers for a specific agent in a workspace
   * This should be called when a workspace is loaded or an agent is initialized
   */
  async loadAndScheduleTriggersForAgent(
    workspaceId: string,
    userId: string,
    agentId: string,
  ): Promise<void> {
    try {
      const triggers = await this.listTriggers(workspaceId, userId, agentId)

      for (const trigger of triggers) {
        if (trigger.enabled && trigger.type === 'scheduled') {
          await this.scheduleTrigger(trigger)
        }
      }

      log.info(`Loaded and scheduled ${triggers.length} triggers for agent ${agentId}`)
    } catch (error) {
      log.error({ err: error }, `Error loading triggers for agent ${agentId}:`)
    }
  }

  /**
   * Fire-and-forget failure notification for trigger executions.
   * Email notification was removed with the billing domain; this is now a no-op hook
   * kept so upstream callers don't break. Replace with a structured log or a user-facing
   * notification channel once available.
   */
  private notifyTriggerFailure(
    trigger: AgentTrigger,
    errorMessage: string,
    _notifyUserId?: string,
  ): void {
    log.warn(
      { triggerId: trigger.id, agentId: trigger.agentId, error: errorMessage },
      'Trigger execution failed',
    )
  }

  /** Human-readable error messages keyed by SDK result subtype. */
  private static readonly SDK_ERROR_MESSAGES: Record<string, string> = {
    error_max_turns:
      'Agent reached the maximum turn limit ({limit} turns). The task may be too complex or the agent may be stuck in a loop.',
    error_tool_execution: 'A tool call failed during execution.',
    error_model: 'The AI model returned an error.',
    cancelled: 'Cancelled by user.',
  }

  /** Map an SDK result subtype to a descriptive error string. */
  private formatSdkError(subtype: string | undefined, sdkResult: any): string {
    const template = subtype ? AgentTriggerManager.SDK_ERROR_MESSAGES[subtype] : undefined
    if (template) {
      return template.replace('{limit}', String(MAX_TURNS.triggers))
    }
    return sdkResult?.result || `Agent execution failed (${subtype || 'unknown error'})`
  }

  private async scheduleTrigger(trigger: AgentTrigger): Promise<void> {
    if (trigger.type !== 'scheduled') return

    const config = trigger.config
    if (config.type !== 'scheduled') return
    const schedule = config.schedule

    const handler = AgentTriggerManager.TRIGGER_MANAGER_SCHEDULE_HANDLERS[schedule.type]
    const timeout = handler ? handler(this, trigger, schedule) : undefined

    if (timeout) {
      this.scheduledJobs.set(trigger.id, timeout)
    }
  }

  private unscheduleTrigger(triggerId: string): void {
    const timeout = this.scheduledJobs.get(triggerId)
    if (timeout) {
      clearTimeout(timeout)
      clearInterval(timeout)
      this.scheduledJobs.delete(triggerId)
    }
  }

  /** Trigger types that bypass the execution queue (interactive channels). */
  private static readonly UNQUEUED_TRIGGER_TYPES = new Set([
    'email',
    'whatsapp',
    'discord',
    'slack',
  ])

  /** Map queue result statuses to early-return execution states. */
  private static readonly QUEUE_SKIP_MAP: Record<
    string,
    { status: TriggerExecution['status']; error: string }
  > = {
    skipped: { status: 'completed', error: 'Skipped: agent already running' },
    queue_full: {
      status: 'failed',
      error: 'Queue full — too many pending executions. Retry later.',
    },
  }

  private static readonly TRIGGER_MANAGER_SCHEDULE_HANDLERS: Record<
    string,
    (
      mgr: AgentTriggerManager,
      trigger: AgentTrigger,
      schedule: { type: string; expression: string; timezone?: string },
    ) => NodeJS.Timeout | undefined
  > = {
    interval: (mgr, trigger, schedule) => {
      const intervalMs = mgr.parseInterval(schedule.expression)
      return setInterval(() => {
        mgr.runTriggerExecution(trigger).catch(console.error)
      }, intervalMs)
    },
    once: (mgr, trigger, schedule) => {
      const targetTime = new Date(schedule.expression)
      const now = new Date()
      const delay = targetTime.getTime() - now.getTime()

      if (delay > 0) {
        return setTimeout(() => {
          mgr.runTriggerExecution(trigger).catch(console.error)
        }, delay)
      }
      return undefined
    },
    cron: (mgr, trigger, schedule) => {
      return setInterval(() => {
        if (mgr.shouldRunCron(schedule.expression, schedule.timezone)) {
          mgr.runTriggerExecution(trigger).catch(console.error)
        }
      }, 60000)
    },
  }

  private async runTriggerExecution(
    trigger: AgentTrigger,
    triggerData?: any,
    requestingUserId?: string,
  ): Promise<TriggerExecution> {
    const execution: TriggerExecution = {
      id: uuidv4(),
      triggerId: trigger.id,
      agentId: trigger.agentId,
      sessionId: uuidv4(),
      status: 'pending',
      startedAt: new Date().toISOString(),
      triggerData,
      logs: [],
    }

    // Queue everything except interactive channels.
    if (!AgentTriggerManager.UNQUEUED_TRIGGER_TYPES.has(trigger.type)) {
      await queuePersistence
        .save({
          executionId: execution.id,
          agentId: trigger.agentId,
          workspaceId: trigger.workspaceId,
          userId: trigger.userId,
          triggerId: trigger.id,
          triggerType: trigger.type,
          triggerName: trigger.name || trigger.id,
          triggerData,
          persistedAt: new Date().toISOString(),
          state: 'queued',
        })
        .catch((err) => log.error('Failed to persist queue task:', err))

      const queueResult = await executionQueue.withSlot(
        { executionId: execution.id, agentId: trigger.agentId, workspaceId: trigger.workspaceId },
        () => this.runTriggerExecutionInner(trigger, execution, triggerData, requestingUserId),
      )

      const skipInfo = AgentTriggerManager.QUEUE_SKIP_MAP[queueResult.status]
      if (skipInfo) {
        log.info(`Queue ${queueResult.status}: trigger ${trigger.id} for agent ${trigger.agentId}`)
        execution.status = skipInfo.status
        execution.completedAt = new Date().toISOString()
        execution.error = skipInfo.error
        return execution
      }

      return (queueResult as { status: 'executed'; value: TriggerExecution }).value
    }

    return this.runTriggerExecutionInner(trigger, execution, triggerData, requestingUserId)
  }

  private async runTriggerExecutionInner(
    trigger: AgentTrigger,
    execution: TriggerExecution,
    triggerData?: any,
    requestingUserId?: string,
  ): Promise<TriggerExecution> {
    // Register execution in cache for real-time tracking using new realtime API
    const effectiveUserId = requestingUserId || trigger.userId
    const executionTracker = realtime.trackExecution({
      id: execution.id,
      type: 'trigger',
      agentId: trigger.agentId,
      userId: effectiveUserId,
      workspaceId: trigger.workspaceId,
      status: 'pending',
      metadata: {
        title: trigger.name,
        description:
          (
            trigger.task ||
            ('task' in trigger.config
              ? ((trigger.config as Record<string, unknown>).task as string)
              : undefined)
          )?.substring(0, 100) || 'Trigger execution',
        triggerId: trigger.id,
        sessionId: execution.sessionId,
      },
    })

    // Resolve task from top-level or config
    const resolvedTask =
      trigger.task ||
      ('task' in trigger.config
        ? ((trigger.config as Record<string, unknown>).task as string)
        : undefined)

    try {
      // Update execution status
      execution.status = 'running'
      await this.saveExecution(execution, trigger)

      // Update cache status using fluent API
      executionTracker.update({ status: 'running' })

      // Add initial log
      await this.addExecutionLog(execution, 'info', 'Starting trigger execution', {
        trigger: trigger.name,
      })

      // Build the prompt for the agent
      let prompt = resolvedTask || 'Execute triggered task'
      if (triggerData) {
        prompt += `\n\nTrigger Data: ${JSON.stringify(triggerData, null, 2)}`
      }

      // Execute the agent (pass executionId to avoid double-registration)
      const result = await this.agentExecutor.executeAgent({
        agentId: trigger.agentId,
        workspaceId: trigger.workspaceId,
        userId: effectiveUserId,
        task: prompt,
        maxTurns: MAX_TURNS.triggers,
        executionId: execution.id, // Pass existing execution ID
        conversationTitle: trigger.name,
      })

      // Executor already updated the execution cache (fail/complete).
      // Check the SDK result to determine if execution actually failed.
      const sdkResult = (result as any)?.result
      const sdkFailed =
        sdkResult?.is_error === true || (sdkResult?.subtype && sdkResult.subtype !== 'success')

      execution.result = result
      execution.completedAt = new Date().toISOString()
      execution.duration = new Date().getTime() - new Date(execution.startedAt).getTime()

      if (sdkFailed) {
        execution.status = 'failed'
        execution.error = this.formatSdkError(sdkResult?.subtype, sdkResult)
        await this.addExecutionLog(execution, 'error', 'Trigger execution failed', {
          error: execution.error,
        })
        trigger.lastError = execution.error
      } else {
        execution.status = 'completed'
        await this.addExecutionLog(execution, 'info', 'Trigger execution completed successfully')
        trigger.triggerCount++
        trigger.lastTriggered = execution.startedAt
      }
      await this.saveTrigger(trigger)
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date().toISOString()
      execution.duration = new Date().getTime() - new Date(execution.startedAt).getTime()

      await this.addExecutionLog(execution, 'error', 'Trigger execution failed', {
        error: execution.error,
      })

      trigger.lastError = execution.error
      if (trigger.triggerCount > 0 && execution.error) {
        trigger.status = 'error'
      }
      await this.saveTrigger(trigger)
      await this.saveExecution(execution, trigger).catch((saveErr) => {
        log.error({ err: saveErr }, `Failed to save execution in catch block:`)
      })
    }

    // Send failure email notification — skip for user cancellations
    if (execution.status === 'failed' && !execution.error?.includes('Cancelled by user')) {
      this.notifyTriggerFailure(trigger, execution.error!, requestingUserId)
    }

    await this.saveExecution(execution, trigger)
    return execution
  }

  private async saveExecution(execution: TriggerExecution, trigger: AgentTrigger): Promise<void> {
    const executionsPath = await this.getAgentExecutionsPath(
      trigger.workspaceId,
      trigger.userId,
      execution.agentId,
    )

    // Ensure directory exists
    await fs.mkdir(executionsPath, { recursive: true })

    const executionPath = path.join(executionsPath, `${execution.id}.json`)
    await fs.writeFile(executionPath, JSON.stringify(execution, null, 2))
  }

  private async addExecutionLog(
    execution: TriggerExecution,
    level: TriggerLog['level'],
    message: string,
    data?: any,
  ): Promise<void> {
    const log: TriggerLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }

    execution.logs.push(log)
  }

  private parseInterval(expression: string): number {
    const match = expression.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error(`Invalid interval expression: ${expression}`)

    const value = parseInt(match[1]!, 10)
    const unit = match[2]!

    const msPerUnit = UNIT_TO_MS[unit]
    if (msPerUnit === undefined) {
      throw new Error(`Invalid interval unit: ${unit}`)
    }
    return value * msPerUnit
  }

  private shouldRunCron(expression: string, timezone?: string): boolean {
    // Simple cron implementation - for production use a proper cron library
    // Format: "minute hour day month dayOfWeek"
    // Example: "0 9 * * 1-5" = 9 AM on weekdays

    const now = timezone
      ? new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
      : new Date()
    const parts = expression.split(' ')
    const minute = parts[0] ?? '*'
    const hour = parts[1] ?? '*'
    const day = parts[2] ?? '*'
    const month = parts[3] ?? '*'
    const dayOfWeek = parts[4] ?? '*'

    const currentMinute = now.getMinutes()
    const currentHour = now.getHours()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth() + 1
    const currentDayOfWeek = now.getDay()

    // Check minute
    if (minute !== '*' && parseInt(minute, 10) !== currentMinute) return false

    // Check hour
    if (hour !== '*' && parseInt(hour, 10) !== currentHour) return false

    // Check day
    if (day !== '*' && parseInt(day, 10) !== currentDay) return false

    // Check month
    if (month !== '*' && parseInt(month, 10) !== currentMonth) return false

    // Check day of week (0 = Sunday)
    if (dayOfWeek !== '*') {
      if (dayOfWeek.includes('-')) {
        const rangeParts = dayOfWeek.split('-').map((n) => parseInt(n, 10))
        const start = rangeParts[0]!
        const end = rangeParts[1]!
        if (currentDayOfWeek < start || currentDayOfWeek > end) return false
      } else if (parseInt(dayOfWeek, 10) !== currentDayOfWeek) {
        return false
      }
    }

    return true
  }

  private async setupEmailTrigger(trigger: AgentTrigger): Promise<void> {
    if (trigger.type !== 'email') return

    // Email triggers are handled by monitoring the inbox
    // This would typically involve setting up a polling mechanism
    // or webhooks to check for new emails matching the trigger conditions

    // For now, we'll implement a simple polling approach
    setInterval(async () => {
      await this.checkEmailTrigger(trigger)
    }, 30000) // Check every 30 seconds
  }

  private async checkEmailTrigger(trigger: AgentTrigger): Promise<void> {
    if (trigger.type !== 'email') return

    const config = trigger.config as EmailTriggerConfig

    // Read messages from workspace-scoped inbox
    const messages = await this.readAgentInbox(trigger)

    // Check for unread messages that match trigger conditions
    const matchingMessages = messages.filter((message) => {
      if (message.metadata?.read) return false

      const conditions = config.conditions || {}

      // Check sender conditions
      if (conditions.from && conditions.from.length > 0) {
        const senderMatch = conditions.from.some((sender: string) =>
          message.sender?.toLowerCase().includes(sender.toLowerCase()),
        )
        if (!senderMatch) return false
      }

      // Check subject conditions
      if (conditions.subject && conditions.subject.length > 0) {
        const subjectMatch = conditions.subject.some((keyword: string) =>
          message.subject?.toLowerCase().includes(keyword.toLowerCase()),
        )
        if (!subjectMatch) return false
      }

      // Check priority conditions
      if (conditions.priority && conditions.priority.length > 0) {
        if (!conditions.priority.includes(message.metadata?.priority)) return false
      }

      // Check keyword conditions
      if (conditions.keywords && conditions.keywords.length > 0) {
        const bodyMatch = conditions.keywords.some((keyword: string) =>
          message.textContent?.toLowerCase().includes(keyword.toLowerCase()),
        )
        if (!bodyMatch) return false
      }

      return true
    })

    // Trigger execution for each matching message
    for (const message of matchingMessages) {
      await this.runTriggerExecution(trigger, {
        email: message,
        messageId: message.id,
        from: message.sender,
        subject: message.subject,
        body: message.textContent,
        isInternal: message.metadata?.type === 'internal',
      })

      // Mark message as read
      await this.markMessageAsRead(trigger, message.id)
    }
  }

  /**
   * Public method to check and execute email trigger (used by backup polling)
   */
  public async checkAndExecuteEmailTrigger(
    workspaceId: string,
    userId: string,
    agentId: string,
    triggerId: string,
  ): Promise<void> {
    const trigger = await this.getTrigger(workspaceId, userId, agentId, triggerId)
    if (trigger && trigger.enabled && trigger.type === 'email') {
      await this.checkEmailTrigger(trigger)
    }
  }

  /**
   * Read messages from agent's workspace-scoped inbox
   */
  private async readAgentInbox(trigger: AgentTrigger): Promise<any[]> {
    try {
      const workspace = await this.workspaceManager.getWorkspace(
        trigger.workspaceId,
        trigger.userId,
      )

      if (!workspace) {
        log.warn(`Workspace not found for trigger ${trigger.id}`)
        return []
      }

      const inboxPath = path.join(workspace.path, '.agents', trigger.agentId, 'inbox')
      const messages: any[] = []

      try {
        const entries = await fs.readdir(inboxPath, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'attachments') {
            try {
              const contentPath = path.join(inboxPath, entry.name, 'content.json')
              const content = await fs.readFile(contentPath, 'utf-8')
              const message = JSON.parse(content)
              messages.push(message)
            } catch (e) {
              log.debug({ err: e }, 'Skip invalid message directories')
            }
          }
        }

        // Sort by date (newest first)
        messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      } catch (e) {
        log.debug({ err: e }, "Inbox doesn't exist yet")
      }

      return messages
    } catch (error) {
      log.error({ err: error }, `Error reading inbox for trigger ${trigger.id}:`)
      return []
    }
  }

  /**
   * Mark a message as read in the workspace-scoped inbox
   */
  private async markMessageAsRead(trigger: AgentTrigger, messageId: string): Promise<void> {
    try {
      const workspace = await this.workspaceManager.getWorkspace(
        trigger.workspaceId,
        trigger.userId,
      )

      if (!workspace) return

      const contentPath = path.join(
        workspace.path,
        '.agents',
        trigger.agentId,
        'inbox',
        messageId,
        'content.json',
      )

      const content = await fs.readFile(contentPath, 'utf-8')
      const message = JSON.parse(content)
      message.metadata = message.metadata || {}
      message.metadata.read = true
      await fs.writeFile(contentPath, JSON.stringify(message, null, 2))
    } catch (error) {
      log.error({ err: error }, `Error marking message ${messageId} as read:`)
    }
  }
}
