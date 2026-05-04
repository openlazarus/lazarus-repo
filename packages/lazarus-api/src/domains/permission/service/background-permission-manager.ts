/**
 * Background Permission Manager
 *
 * Singleton registry for pending permission requests from background agent
 * executions. Supports two modes:
 *
 * 1. Channel-based (WhatsApp, Discord) — request sent via channel, times out
 * 2. Persistent (UI-based) — stored in database, waits indefinitely for
 *    user approval via the web dashboard
 *
 * When an agent running in the background needs approval for an ask_first
 * tool, the request is registered here with a resolve callback. The
 * corresponding provider sends a notification. When the user responds,
 * the webhook/API handler calls resolve() to unblock the agent.
 */

import { approvalService } from '@domains/permission/service/approval.service'
import { eventBus } from '@realtime/events/event-bus'
import type {
  PendingPermission,
  RegisterPersistentParams,
} from '@domains/permission/types/permission.types'
import type { IBackgroundPermissionManager } from './background-permission-manager.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('background-permission-manager')

// Use globalThis to survive duplicate module loads (dynamic imports, ts-node re-resolution)
const GLOBAL_KEY = Symbol.for('lazarus.BackgroundPermissionManager')

export class BackgroundPermissionManager implements IBackgroundPermissionManager {
  /** Pending permissions keyed by requestId */
  private pending: Map<string, PendingPermission> = new Map()

  /** Channel-specific key → requestId lookup for text fallback ("yes"/"no") */
  private channelIndex: Map<string, string> = new Map()

  private constructor() {}

  static getInstance(): BackgroundPermissionManager {
    const g = globalThis as any
    if (!g[GLOBAL_KEY]) {
      g[GLOBAL_KEY] = new BackgroundPermissionManager()
    }
    return g[GLOBAL_KEY]
  }

  /**
   * Register a channel-based pending permission request (WhatsApp, Discord, etc.).
   * The resolve callback will be called with true (approved) or false (denied/timed-out).
   */
  register(
    requestId: string,
    channelKey: string,
    resolve: (approved: boolean) => void,
    timeoutMs: number,
    platform: string,
    toolName: string,
  ): void {
    // Clean up any existing request on the same channel (only one pending at a time per channel)
    const existingRequestId = this.channelIndex.get(channelKey)
    if (existingRequestId) {
      this.resolve(existingRequestId, false) // auto-deny the old one
    }

    // If a persistent entry already exists for this requestId (registered by the executor),
    // don't overwrite it — just add the channel index so the channel can resolve it.
    const existing = this.pending.get(requestId)
    if (existing?.persistent) {
      this.channelIndex.set(channelKey, requestId)
      log.info(
        `Linked channel ${platform} to existing persistent approval ${requestId} (tool: ${toolName}, channel: ${channelKey})`,
      )
      return
    }

    const timeout =
      timeoutMs > 0
        ? setTimeout(() => {
            log.info(
              `Permission request ${requestId} timed out after ${timeoutMs}ms — auto-denying`,
            )
            this.resolve(requestId, false)
          }, timeoutMs)
        : null

    const entry: PendingPermission = {
      requestId,
      channelKey,
      platform,
      toolName,
      resolve,
      timeout,
      createdAt: Date.now(),
      persistent: false,
    }

    this.pending.set(requestId, entry)
    this.channelIndex.set(channelKey, requestId)

    log.info(
      `Registered permission request ${requestId} on ${platform} (tool: ${toolName}, channel: ${channelKey})`,
    )
  }

  /**
   * Register a persistent permission request (UI-based, no timeout).
   * Writes to the database and emits a WebSocket event so the frontend
   * can display it in the "Requested Approvals" section.
   */
  async registerPersistent(params: RegisterPersistentParams): Promise<void> {
    const {
      requestId,
      workspaceId,
      agentId,
      agentName,
      executionId,
      toolName,
      toolInput,
      description,
      riskLevel,
      activityTrace,
      resolve,
    } = params

    // Write to database for persistence across restarts
    try {
      await approvalService.createApproval({
        id: requestId,
        workspaceId,
        agentId,
        agentName,
        executionId,
        toolName,
        toolInput,
        description,
        riskLevel,
        activityTrace,
      })
    } catch (err) {
      log.error({ err: err }, `Failed to persist approval ${requestId}:`)
      // Still register in-memory so the agent can be unblocked if resolved before restart
    }

    // Store in-memory resolve callback (no timeout — waits indefinitely)
    const entry: PendingPermission = {
      requestId,
      channelKey: `ui:${workspaceId}:${agentId}:${executionId}`,
      platform: 'ui',
      toolName,
      resolve,
      timeout: null,
      createdAt: Date.now(),
      persistent: true,
    }

    this.pending.set(requestId, entry)

    // Emit event so the approval broadcaster sends it via WebSocket
    eventBus.emit('approval:requested', {
      approvalId: requestId,
      workspaceId,
      agentId,
      agentName,
      executionId,
      toolName,
      description,
      riskLevel,
      createdAt: new Date().toISOString(),
    })

    log.info(`Registered persistent approval ${requestId} (agent: ${agentName}, tool: ${toolName})`)
  }

  /**
   * Resolve a pending permission by requestId.
   * For persistent approvals, also updates the database record.
   */
  resolve(requestId: string, approved: boolean, resolvedBy?: string): void {
    const entry = this.pending.get(requestId)
    if (!entry) {
      log.warn(
        `resolve() called for ${requestId} but not found in pending map (${this.pending.size} entries)`,
      )
      return
    }

    if (entry.timeout) {
      clearTimeout(entry.timeout)
    }
    this.pending.delete(requestId)
    this.channelIndex.delete(entry.channelKey)

    // Update database for persistent approvals
    if (entry.persistent) {
      approvalService.resolveApproval(requestId, approved, resolvedBy || 'unknown').catch((err) => {
        log.error({ err: err }, `Failed to update DB for ${requestId}:`)
      })

      // Parse workspace/agent from channelKey: "ui:{workspaceId}:{agentId}:{executionId}"
      const parts = entry.channelKey.split(':')
      const workspaceId = parts[1]
      const agentId = parts[2]
      const executionId = parts[3]

      eventBus.emit('approval:resolved', {
        approvalId: requestId,
        workspaceId: workspaceId || '',
        agentId: agentId || '',
        executionId: executionId || '',
        approved,
        resolvedBy: resolvedBy || 'unknown',
      })
    }

    log.info(
      `Resolved ${requestId}: ${approved ? 'APPROVED' : 'DENIED'} (tool: ${entry.toolName}, persistent: ${entry.persistent})`,
    )
    entry.resolve(approved)
  }

  /**
   * Find a pending permission by channel key (for text fallback matching).
   */
  findByChannelKey(channelKey: string): PendingPermission | undefined {
    const requestId = this.channelIndex.get(channelKey)
    if (!requestId) return undefined
    return this.pending.get(requestId)
  }

  /**
   * Resolve a pending permission by channel key (used for text "yes"/"no" fallback).
   */
  resolveByChannelKey(channelKey: string, approved: boolean): void {
    const requestId = this.channelIndex.get(channelKey)
    if (requestId) {
      this.resolve(requestId, approved)
    }
  }

  /**
   * Clean up a specific request without resolving it (e.g. if the agent execution ends).
   */
  cleanup(requestId: string): void {
    const entry = this.pending.get(requestId)
    if (!entry) return

    if (entry.timeout) {
      clearTimeout(entry.timeout)
    }
    this.pending.delete(requestId)
    this.channelIndex.delete(entry.channelKey)

    log.info(`Cleaned up ${requestId}`)
  }

  /**
   * Recover on startup: expire all pending approvals in the database
   * since the in-memory resolve callbacks are lost after a process restart.
   */
  async recoverOnStartup(): Promise<void> {
    try {
      const expired = await approvalService.expireAllPending()
      if (expired > 0) {
        log.info(`Startup recovery: expired ${expired} orphaned approval(s)`)
      }
    } catch (err) {
      log.error({ err: err }, 'Startup recovery failed')
    }
  }

  /**
   * Get the count of pending permissions (for monitoring/debugging).
   */
  get pendingCount(): number {
    return this.pending.size
  }
}
