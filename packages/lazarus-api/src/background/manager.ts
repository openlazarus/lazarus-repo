/**
 * Background Process Manager
 *
 * Main orchestrator for all background processes
 * Manages workspace lifecycle, inbox polling, trigger initialization, and health monitoring
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import { TriggerInitializationService } from './trigger-initialization.service'
import { WorkspaceTaskRegistry } from './workspace-task-registry'
import { BACKGROUND_CONFIG, logConfig } from './config'
import { WorkspaceState, BackgroundProcessHealth, BackgroundProcessStats } from './types'
import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { MCPConfigManager } from '@domains/mcp/service/mcp-config-manager'
import { createLogger } from '@utils/logger'

const log = createLogger('background-process-manager')

const STORAGE_BASE = process.env.STORAGE_BASE || '/mnt/sdc/storage'

export class BackgroundProcessManager {
  private triggerInitService: TriggerInitializationService
  private mcpConfigManager: MCPConfigManager
  private workspaceRegistries: Map<string, WorkspaceTaskRegistry> = new Map()
  private workspaceStates: Map<string, WorkspaceState> = new Map()
  private isRunning = false
  private startTime: Date | null = null

  // Global timers
  private cleanupTimer: NodeJS.Timeout | null = null
  private healthCheckTimer: NodeJS.Timeout | null = null
  constructor() {
    this.triggerInitService = new TriggerInitializationService()
    this.mcpConfigManager = new MCPConfigManager()
  }

  /**
   * Initialize the background process manager
   */
  async initialize(): Promise<void> {
    if (!BACKGROUND_CONFIG.ENABLE_BACKGROUND_PROCESSES) {
      log.info('Background processes are disabled')
      return
    }

    log.info('Initializing')
    logConfig()
  }

  /**
   * Start all background processes
   */
  async start(): Promise<void> {
    if (!BACKGROUND_CONFIG.ENABLE_BACKGROUND_PROCESSES) {
      log.info('Background processes are disabled')
      return
    }

    if (this.isRunning) {
      log.warn('Already running')
      return
    }

    log.info('Starting')
    this.isRunning = true
    this.startTime = new Date()

    try {
      // Load all active workspaces from Supabase
      const workspaces = await this.loadActiveWorkspaces()

      log.info({ count: workspaces.length }, 'Found active workspaces')

      // Initialize each workspace
      for (const workspace of workspaces) {
        try {
          await this.loadWorkspace(workspace.id, workspace.user_id)
        } catch (error) {
          log.error({ err: error, workspaceId: workspace.id }, 'Failed to load workspace')
        }
      }

      // Start global timers
      this.startCleanupTimer()
      this.startHealthCheckTimer()
      log.info({ workspaceCount: this.workspaceStates.size }, 'Started successfully')
    } catch (error) {
      log.error({ err: error }, 'Failed to start')
      throw error
    }
  }

  /**
   * Stop all background processes (graceful shutdown)
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      log.info('Not running')
      return
    }

    log.info('Stopping')

    // Stop global timers
    this.stopCleanupTimer()
    this.stopHealthCheckTimer()
    // Unload all workspaces
    const workspaceIds = Array.from(this.workspaceStates.keys())
    for (const workspaceId of workspaceIds) {
      try {
        await this.unloadWorkspace(workspaceId)
      } catch (error) {
        log.error({ err: error, workspaceId }, 'Error unloading workspace')
      }
    }

    this.isRunning = false

    log.info('Stopped successfully')
  }

  /**
   * Load a workspace and start background processes for it
   */
  async loadWorkspace(workspaceId: string, userId: string): Promise<void> {
    if (this.workspaceStates.has(workspaceId)) {
      log.info({ workspaceId }, 'Workspace already loaded')
      return
    }

    log.info({ workspaceId }, 'Loading workspace')

    try {
      // Refresh `.mcp.json` so the SDK-spawned MCP subprocesses get the
      // latest per-workspace env injection (WORKSPACE_PATH, LAZARUS_WORKSPACE_ID).
      // Idempotent: no-op when the config is already up to date.
      await this.refreshWorkspaceMCPConfig(workspaceId)

      // Create task registry for this workspace
      const registry = new WorkspaceTaskRegistry(workspaceId)
      this.workspaceRegistries.set(workspaceId, registry)

      // Get list of agents in workspace
      const agentIds = await this.getWorkspaceAgents(workspaceId)

      log.info({ workspaceId, agentCount: agentIds.length }, 'Found agents in workspace')

      // Initialize triggers for all agents
      await this.triggerInitService.loadWorkspaceTriggers(workspaceId, userId, agentIds, registry)

      // Mark workspace as active
      this.workspaceStates.set(workspaceId, {
        workspaceId,
        agentIds,
        loadedAt: new Date().toISOString(),
        status: 'active',
        errorCount: 0,
      })

      log.info({ workspaceId }, 'Workspace loaded successfully')
    } catch (error) {
      log.error({ err: error, workspaceId }, 'Failed to load workspace')

      // Mark workspace as failed
      this.workspaceStates.set(workspaceId, {
        workspaceId,
        agentIds: [],
        loadedAt: new Date().toISOString(),
        status: 'failed',
        errorCount: 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Unload a workspace and stop all background processes for it
   */
  async unloadWorkspace(workspaceId: string): Promise<void> {
    log.info({ workspaceId }, 'Unloading workspace')

    // Clear all tasks for this workspace
    const registry = this.workspaceRegistries.get(workspaceId)
    if (registry) {
      registry.clearAll()
      this.workspaceRegistries.delete(workspaceId)
    }

    // Remove workspace state
    this.workspaceStates.delete(workspaceId)

    log.info({ workspaceId }, 'Workspace unloaded')
  }

  /**
   * Reload a workspace (unload and load again)
   */
  async reloadWorkspace(workspaceId: string): Promise<void> {
    log.info({ workspaceId }, 'Reloading workspace')

    // Get workspace info from state
    const state = this.workspaceStates.get(workspaceId)
    if (!state) {
      log.warn({ workspaceId }, 'Cannot reload unknown workspace')
      return
    }

    // Get workspace from database to get userId
    const workspace = await workspaceRepository.getWorkspaceOwnerIds(workspaceId)

    if (!workspace) {
      log.error({ workspaceId }, 'Workspace not found in database')
      return
    }

    // Unload and reload
    await this.unloadWorkspace(workspaceId)
    await this.loadWorkspace(workspaceId, workspace.user_id)

    log.info({ workspaceId }, 'Workspace reloaded')
  }

  /**
   * Get health status
   */
  getHealth(): BackgroundProcessHealth {
    const activeWorkspaces = Array.from(this.workspaceStates.values()).filter(
      (w) => w.status === 'active',
    )
    const failedWorkspaces = Array.from(this.workspaceStates.values()).filter(
      (w) => w.status === 'failed',
    )

    const activeTasks = Array.from(this.workspaceRegistries.values()).reduce(
      (sum, registry) => sum + registry.getTaskCount(),
      0,
    )

    const issues: string[] = []

    // Check for failed workspaces
    if (failedWorkspaces.length > 0) {
      issues.push(`${failedWorkspaces.length} workspace(s) failed to load`)
    }

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (failedWorkspaces.length > 0) {
      status = failedWorkspaces.length > activeWorkspaces.length / 2 ? 'unhealthy' : 'degraded'
    }

    return {
      status,
      activeWorkspaces: activeWorkspaces.length,
      activeTasks,
      lastHealthCheck: new Date().toISOString(),
      issues,
    }
  }

  /**
   * Get statistics
   */
  getStats(): BackgroundProcessStats {
    const workspaceStatesArray = Array.from(this.workspaceStates.values())

    return {
      workspaces: {
        total: workspaceStatesArray.length,
        active: workspaceStatesArray.filter((w) => w.status === 'active').length,
        failed: workspaceStatesArray.filter((w) => w.status === 'failed').length,
      },
      triggers: this.triggerInitService.getStats(),
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Load all active workspaces from Supabase
   */
  private async loadActiveWorkspaces(): Promise<any[]> {
    return workspaceRepository.getActiveWorkspaces()
  }

  /**
   * Re-save the workspace MCP config so `.mcp.json` picks up the latest
   * per-workspace env injection. Reads the existing config and writes it back.
   * No-op when the workspace has no `.mcp.config.json`.
   */
  private async refreshWorkspaceMCPConfig(workspaceId: string): Promise<void> {
    const workspacePath = path.join(STORAGE_BASE, 'workspaces', workspaceId)
    try {
      const existing = await this.mcpConfigManager.getWorkspaceMCPConfig(workspacePath)
      if (!existing) return
      await this.mcpConfigManager.saveWorkspaceMCPConfig(workspacePath, existing)
    } catch (err) {
      log.warn({ err, workspaceId }, 'Failed to refresh MCP config')
    }
  }

  /**
   * Get list of agents in a workspace
   */
  private async getWorkspaceAgents(workspaceId: string): Promise<string[]> {
    const agentsPath = path.join(STORAGE_BASE, 'workspaces', workspaceId, '.agents')

    try {
      const agentDirs = await fs.readdir(agentsPath)

      // Filter for directories (agent IDs)
      const agentIds: string[] = []
      for (const agentDir of agentDirs) {
        const agentDirPath = path.join(agentsPath, agentDir)
        const stat = await fs.stat(agentDirPath)
        if (stat.isDirectory()) {
          agentIds.push(agentDir)
        }
      }

      return agentIds
    } catch (err) {
      log.debug({ err }, 'No agents directory or error reading it')
      return []
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch((error) => {
        log.error({ err: error }, 'Cleanup error')
      })
    }, BACKGROUND_CONFIG.CLEANUP_INTERVAL_MS)

    log.info({ intervalMs: BACKGROUND_CONFIG.CLEANUP_INTERVAL_MS }, 'Cleanup timer started')
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
      log.info('Cleanup timer stopped')
    }
  }

  /**
   * Perform cleanup tasks
   */
  private async performCleanup(): Promise<void> {
    log.info('Running cleanup tasks')

    // Cleanup can include:
    // - Clear old execution cache entries
    // - Cleanup temporary files
    // - etc.

    // For now, just log
    log.info('Cleanup complete')
  }

  /**
   * Start health check timer
   */
  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch((error) => {
        log.error({ err: error }, 'Health check error')
      })
    }, BACKGROUND_CONFIG.HEALTH_CHECK_INTERVAL_MS)

    log.info(
      { intervalMs: BACKGROUND_CONFIG.HEALTH_CHECK_INTERVAL_MS },
      'Health check timer started',
    )
  }

  /**
   * Stop health check timer
   */
  private stopHealthCheckTimer(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
      log.info('Health check timer stopped')
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const health = this.getHealth()

    if (health.status === 'degraded') {
      log.warn({ issues: health.issues }, 'Health degraded')
    } else if (health.status === 'unhealthy') {
      log.error({ issues: health.issues }, 'Health unhealthy')

      // Attempt recovery
      if (BACKGROUND_CONFIG.TRIGGER_RELOAD_ON_ERROR) {
        await this.attemptRecovery()
      }
    }
  }

  /**
   * Attempt to recover failed workspaces
   */
  private async attemptRecovery(): Promise<void> {
    log.info('Attempting recovery')

    const failedWorkspaces = Array.from(this.workspaceStates.values()).filter(
      (w) => w.status === 'failed' && w.errorCount < BACKGROUND_CONFIG.MAX_CONSECUTIVE_FAILURES,
    )

    for (const workspace of failedWorkspaces) {
      try {
        log.info({ workspaceId: workspace.workspaceId }, 'Recovering workspace')
        await this.reloadWorkspace(workspace.workspaceId)
      } catch (error) {
        log.error({ err: error, workspaceId: workspace.workspaceId }, 'Recovery failed')

        // Increment error count
        const state = this.workspaceStates.get(workspace.workspaceId)
        if (state) {
          state.errorCount++
        }
      }
    }
  }

  /**
   * Check if manager is running
   */
  isManagerRunning(): boolean {
    return this.isRunning
  }
}

// Singleton instance
export const backgroundProcessManager = new BackgroundProcessManager()
