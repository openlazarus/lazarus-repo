/**
 * Trigger Initialization Service
 *
 * Loads and schedules all triggers (scheduled, email) for all agents on startup
 * Re-initializes triggers when workspace/agent configuration changes
 */

import { AgentTriggerManager } from '@domains/agent/service/triggers/trigger-manager'
import { WorkspaceTaskRegistry } from './workspace-task-registry'
import { BACKGROUND_CONFIG } from './config'
import { TriggerInitResult } from './types'
import { executionCache } from '@realtime'
import { createLogger } from '@utils/logger'
import { checkCredits } from '@shared/services/credits-guard'

const log = createLogger('trigger-init')

const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
}

interface TriggerInitScheduleContext {
  trigger: any
  registry: WorkspaceTaskRegistry
  schedule: { type: string; expression: string; timezone?: string }
  parseInterval: (expression: string) => number
  shouldRunCron: (expression: string, timezone?: string) => boolean
  executeTrigger: (trigger: any) => Promise<void>
}

const TRIGGER_INIT_SCHEDULE_HANDLERS: Record<string, (ctx: TriggerInitScheduleContext) => void> = {
  interval: (ctx) => {
    const intervalMs = ctx.parseInterval(ctx.schedule.expression)
    const timeout = setInterval(() => {
      ctx.executeTrigger(ctx.trigger).catch((error) => {
        log.error({ err: error, triggerId: ctx.trigger.id }, 'Trigger execution failed')
      })
    }, intervalMs)

    ctx.registry.registerInterval(
      `trigger-${ctx.trigger.id}`,
      timeout,
      `Scheduled trigger ${ctx.trigger.name} (${ctx.schedule.expression})`,
    )
  },

  once: (ctx) => {
    const targetTime = new Date(ctx.schedule.expression)
    const now = new Date()
    const delay = targetTime.getTime() - now.getTime()

    if (delay > 0) {
      const timeout = setTimeout(() => {
        ctx.executeTrigger(ctx.trigger).catch((error) => {
          log.error({ err: error, triggerId: ctx.trigger.id }, 'Trigger execution failed')
        })
      }, delay)

      ctx.registry.registerTimeout(
        `trigger-${ctx.trigger.id}`,
        timeout,
        `Once trigger ${ctx.trigger.name} at ${ctx.schedule.expression}`,
      )
    } else {
      log.info(
        { triggerId: ctx.trigger.id, expression: ctx.schedule.expression },
        "Skipping past 'once' trigger",
      )
    }
  },

  cron: (ctx) => {
    const timeout = setInterval(() => {
      if (ctx.shouldRunCron(ctx.schedule.expression, ctx.schedule.timezone)) {
        ctx.executeTrigger(ctx.trigger).catch((error) => {
          log.error({ err: error, triggerId: ctx.trigger.id }, 'Trigger execution failed')
        })
      }
    }, 60000)

    ctx.registry.registerInterval(
      `trigger-${ctx.trigger.id}`,
      timeout,
      `Cron trigger ${ctx.trigger.name} (${ctx.schedule.expression})`,
    )
  },
}

export class TriggerInitializationService {
  private triggerManager: AgentTriggerManager
  private scheduledTriggerCount: number = 0
  private emailTriggerCount: number = 0
  /** Track last fire time per trigger to prevent double-dispatch within the same cron minute */
  private lastFireTime: Map<string, number> = new Map()

  constructor() {
    this.triggerManager = new AgentTriggerManager()
  }

  /**
   * Load triggers for a workspace
   */
  async loadWorkspaceTriggers(
    workspaceId: string,
    userId: string,
    agentIds: string[],
    registry: WorkspaceTaskRegistry,
  ): Promise<void> {
    if (!BACKGROUND_CONFIG.ENABLE_TRIGGER_INITIALIZATION) {
      log.info('Trigger initialization is disabled')
      return
    }

    if (agentIds.length === 0) {
      log.info({ workspaceId }, 'No agents with triggers in workspace')
      return
    }

    log.info({ workspaceId, agentCount: agentIds.length }, 'Loading triggers for workspace')

    // Load triggers for each agent
    const results = await Promise.all(
      agentIds.map((agentId) => this.loadAgentTriggers(workspaceId, userId, agentId, registry)),
    )

    // Summarize results
    const totalScheduled = results.reduce((sum, r) => sum + r.scheduledTriggers, 0)
    const totalEmail = results.reduce((sum, r) => sum + r.emailTriggers, 0)
    const errors = results.filter((r) => r.error)

    log.info(
      {
        workspaceId,
        scheduledTriggers: totalScheduled,
        emailTriggers: totalEmail,
      },
      'Loaded triggers for workspace',
    )

    if (errors.length > 0) {
      log.warn({ agentErrorCount: errors.length }, 'Some agents had errors loading triggers')
    }
  }

  /**
   * Load triggers for a single agent
   */
  private async loadAgentTriggers(
    workspaceId: string,
    userId: string,
    agentId: string,
    registry: WorkspaceTaskRegistry,
  ): Promise<TriggerInitResult> {
    try {
      // Get all triggers for this agent
      const triggers = await this.triggerManager.listTriggers(workspaceId, userId, agentId)

      let scheduledCount = 0
      let emailCount = 0

      for (const trigger of triggers) {
        // Always override with filesystem context (source of truth for location)
        trigger.workspaceId = workspaceId
        trigger.userId = userId
        trigger.agentId = agentId

        if (!trigger.enabled) {
          continue
        }

        // Handle scheduled triggers
        if (trigger.type === 'scheduled') {
          await this.scheduleScheduledTrigger(trigger, registry)
          scheduledCount++
          this.scheduledTriggerCount++
        }

        // Handle email triggers (polling backup)
        if (trigger.type === 'email' && BACKGROUND_CONFIG.EMAIL_TRIGGER_POLLING_ENABLED) {
          await this.scheduleEmailTrigger(trigger, registry)
          emailCount++
          this.emailTriggerCount++
        }
      }

      if (scheduledCount > 0 || emailCount > 0) {
        log.info({ agentId, scheduledCount, emailCount }, 'Agent triggers loaded')
      }

      return {
        agentId,
        scheduledTriggers: scheduledCount,
        emailTriggers: emailCount,
      }
    } catch (error) {
      log.error({ err: error, agentId }, 'Error loading triggers for agent')

      return {
        agentId,
        scheduledTriggers: 0,
        emailTriggers: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Schedule a scheduled trigger (cron, interval, once)
   */
  private async scheduleScheduledTrigger(
    trigger: any,
    registry: WorkspaceTaskRegistry,
  ): Promise<void> {
    const config = trigger.config
    const schedule = config.schedule

    const handler = TRIGGER_INIT_SCHEDULE_HANDLERS[schedule.type]
    if (handler) {
      handler({
        trigger,
        registry,
        schedule,
        parseInterval: (expression) => this.parseInterval(expression),
        shouldRunCron: (expression, timezone) => this.shouldRunCron(expression, timezone),
        executeTrigger: (t) => this.executeTrigger(t),
      })
    }
  }

  /**
   * Schedule an email trigger (polling backup to webhook)
   */
  private async scheduleEmailTrigger(trigger: any, registry: WorkspaceTaskRegistry): Promise<void> {
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 5

    // Set up polling interval for email trigger
    const interval = setInterval(async () => {
      try {
        await this.checkEmailTrigger(trigger)
        consecutiveFailures = 0 // Reset on success
      } catch (error) {
        consecutiveFailures++
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          log.warn(
            {
              triggerId: trigger.id,
              consecutiveFailures,
              workspaceId: trigger.workspaceId,
            },
            'Email trigger failed repeatedly, stopping polling (workspace may have been deleted)',
          )
          clearInterval(interval)
          return
        }
      }
    }, BACKGROUND_CONFIG.EMAIL_TRIGGER_POLLING_INTERVAL_MS)

    registry.registerInterval(
      `email-trigger-${trigger.id}`,
      interval,
      `Email trigger ${trigger.name} (backup polling)`,
    )
  }

  /**
   * Execute a trigger (with duplicate-dispatch guard and timeout retry)
   */
  private async executeTrigger(trigger: any): Promise<void> {
    const MAX_RETRIES = 1 // One retry on timeout
    const RETRY_DELAY_MS = 30_000 // 30 seconds between retries

    // Credits check — no channel to notify on, just log & skip
    if (!(await checkCredits(trigger.workspaceId, 'scheduled'))) {
      log.warn(
        { triggerId: trigger.id, agentId: trigger.agentId },
        'Skipping scheduled trigger — insufficient credits',
      )
      return
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Guard: skip if this agent is already executing (prevents concurrent runs causing env var conflicts)
      if (executionCache.isAgentExecuting(trigger.agentId)) {
        log.info(
          { triggerId: trigger.id, agentId: trigger.agentId },
          'Skipping trigger — agent is already executing',
        )
        return
      }

      // Guard: skip if this trigger fired within the last 30 seconds (prevents double-dispatch within same cron minute)
      // Only apply dedup guard on first attempt — retries should bypass it
      if (attempt === 0) {
        const now = Date.now()
        const lastFire = this.lastFireTime.get(trigger.id) || 0
        if (now - lastFire < 30_000) {
          log.info(
            {
              triggerId: trigger.id,
              secondsSinceLastFire: Math.round((now - lastFire) / 1000),
            },
            'Skipping trigger — within dedup window',
          )
          return
        }
        this.lastFireTime.set(trigger.id, now)
      }

      const isRetry = attempt > 0
      log.info(
        {
          triggerId: trigger.id,
          triggerName: trigger.name,
          attempt,
          maxRetries: MAX_RETRIES,
          isRetry,
        },
        isRetry ? 'Executing trigger (retry)' : 'Executing trigger',
      )

      try {
        await this.triggerManager.executeTrigger(
          trigger.workspaceId,
          trigger.userId,
          trigger.agentId,
          trigger.id,
          undefined, // No trigger data for scheduled triggers
        )
        return // Success — no retry needed
      } catch (error) {
        const isTimeout =
          error instanceof Error &&
          (error.message.includes('timed out') || error.message.includes('no activity for'))

        if (isTimeout && attempt < MAX_RETRIES) {
          log.warn(
            {
              triggerId: trigger.id,
              retryDelaySeconds: RETRY_DELAY_MS / 1000,
              attempt: attempt + 1,
              maxAttempts: MAX_RETRIES + 1,
            },
            'Trigger timed out, scheduling retry',
          )
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
          continue
        }

        log.error({ err: error }, 'Trigger execution failed')
        throw error
      }
    }
  }

  /**
   * Check email trigger conditions (backup to webhook)
   */
  private async checkEmailTrigger(trigger: any): Promise<void> {
    try {
      await this.triggerManager.checkAndExecuteEmailTrigger(
        trigger.workspaceId,
        trigger.userId,
        trigger.agentId,
        trigger.id,
      )
    } catch (error) {
      log.error({ err: error, triggerId: trigger.id }, 'Email trigger check failed')
      throw error // Propagate so polling wrapper can track consecutive failures
    }
  }

  /**
   * Parse interval expression (e.g., "5m" -> 300000ms)
   */
  private parseInterval(expression: string): number {
    const match = expression.match(/^(\d+)([smhd])$/)
    if (!match) {
      throw new Error(`Invalid interval expression: ${expression}`)
    }

    const value = parseInt(match[1]!, 10)
    const unit = match[2]!

    const msPerUnit = UNIT_TO_MS[unit]
    if (msPerUnit === undefined) {
      throw new Error(`Invalid interval unit: ${unit}`)
    }
    return value * msPerUnit
  }

  /**
   * Check if cron should run now
   */
  private shouldRunCron(expression: string, timezone?: string): boolean {
    // Simple cron implementation
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

    // Check day of week
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

  /**
   * Get statistics
   */
  getStats() {
    return {
      scheduled: this.scheduledTriggerCount,
      email: this.emailTriggerCount,
      total: this.scheduledTriggerCount + this.emailTriggerCount,
    }
  }
}
