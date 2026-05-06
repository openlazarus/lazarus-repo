/**
 * FileWatcher - File system monitoring with real-time broadcasting
 *
 * Migrated from src/services/file/file-watcher.service.ts
 * Now integrated with the unified realtime EventBus architecture
 *
 * Uses chokidar to watch workspace directories and emits events
 * to the EventBus, which are then broadcast via FileBroadcaster.
 */

import chokidar, { FSWatcher } from 'chokidar'
import * as path from 'path'
import * as fs from 'fs/promises'
import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { resolveWorkspacePath } from '@domains/cache/service/workspace-path-cache'
import { STORAGE_BASE_PATH } from '@infrastructure/config/storage'

const log = createLogger('file-watcher')

/**
 * Workspace watcher entry
 */
interface WatcherEntry {
  workspaceId: string
  userId: string
  teamId?: string
  watcher: FSWatcher
  subscriberCount: number
}

/**
 * FileWatcher class
 */
export class FileWatcher {
  /** Active watchers by key (userId:workspaceId) */
  private watchers: Map<string, WatcherEntry> = new Map()

  constructor(_storageBasePath: string = './storage') {
    log.info('Initialized')
  }

  /**
   * Start watching a workspace for file changes
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param teamId - Optional team ID
   */
  async watchWorkspace(workspaceId: string, userId: string, teamId?: string): Promise<void> {
    const key = `${userId}:${workspaceId}`

    // If already watching, just increment subscriber count
    if (this.watchers.has(key)) {
      const entry = this.watchers.get(key)!
      entry.subscriberCount++
      log.info(
        { workspaceId, subscriberCount: entry.subscriberCount },
        'Incremented subscriber count for workspace',
      )
      return
    }

    // Determine workspace path (support both team-based and user-based)
    const workspacePath = await this.getWorkspacePath(workspaceId, userId, teamId)

    // Check if workspace directory exists
    try {
      await fs.access(workspacePath)
    } catch (error) {
      log.error({ workspacePath }, 'Workspace directory not found')
      throw new Error(`Workspace directory not found: ${workspaceId}`)
    }

    log.info({ workspacePath }, 'Starting to watch')

    // Create chokidar watcher
    const watcher = chokidar.watch(workspacePath, {
      ignored: [
        /(^|[/\\])\../, // Ignore dotfiles
        /node_modules/, // Ignore node_modules
        /.versions/, // Ignore version history
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    // Setup event handlers
    this.setupWatcherHandlers(watcher, workspaceId, workspacePath)

    // Store watcher entry
    this.watchers.set(key, {
      workspaceId,
      userId,
      teamId,
      watcher,
      subscriberCount: 1,
    })

    // Emit file:watch-started event
    eventBus.emit('file:watch-started', { workspaceId, userId })
  }

  /**
   * Stop watching a workspace
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   */
  async unwatchWorkspace(workspaceId: string, userId: string): Promise<void> {
    const key = `${userId}:${workspaceId}`
    const entry = this.watchers.get(key)

    if (!entry) {
      return // Not watching
    }

    // Decrement subscriber count
    entry.subscriberCount--

    // If no more subscribers, stop watching
    if (entry.subscriberCount <= 0) {
      await entry.watcher.close()
      this.watchers.delete(key)

      // Emit file:watch-stopped event
      eventBus.emit('file:watch-stopped', { workspaceId })

      log.info({ workspaceId }, 'Stopped watching workspace')
    } else {
      log.info(
        { workspaceId, subscriberCount: entry.subscriberCount },
        'Decremented subscriber count for workspace',
      )
    }
  }

  /**
   * Manually notify about a file change (for API-triggered changes)
   *
   * @param workspaceId - Workspace ID
   * @param filePath - File path
   * @param type - Change type
   */
  notifyFileChange(
    workspaceId: string,
    filePath: string,
    type: 'file:created' | 'file:modified' | 'file:deleted',
  ): void {
    const eventType = type as 'file:created' | 'file:modified' | 'file:deleted'

    if (eventType === 'file:created') {
      eventBus.emit('file:created', { workspaceId, filePath })
    } else if (eventType === 'file:modified') {
      eventBus.emit('file:modified', { workspaceId, filePath })
    } else if (eventType === 'file:deleted') {
      eventBus.emit('file:deleted', { workspaceId, filePath })
    }
  }

  /**
   * Get active watcher count
   */
  getWatcherCount(): number {
    return this.watchers.size
  }

  /**
   * Get total subscriber count across all watchers
   */
  getTotalSubscribers(): number {
    let total = 0
    for (const entry of this.watchers.values()) {
      total += entry.subscriberCount
    }
    return total
  }

  /**
   * Get statistics about file watchers
   */
  getStats(): {
    totalWatchers: number
    totalSubscribers: number
    byWorkspace: Record<string, number>
  } {
    const stats = {
      totalWatchers: this.watchers.size,
      totalSubscribers: 0,
      byWorkspace: {} as Record<string, number>,
    }

    for (const entry of this.watchers.values()) {
      stats.totalSubscribers += entry.subscriberCount
      stats.byWorkspace[entry.workspaceId] = entry.subscriberCount
    }

    return stats
  }

  /**
   * Cleanup all watchers
   */
  async cleanup(): Promise<void> {
    log.info('Cleaning up all watchers')

    for (const [key, entry] of this.watchers) {
      await entry.watcher.close()
      log.info({ watcherKey: key }, 'Closed watcher')
    }

    this.watchers.clear()
    log.info('Cleanup complete')
  }

  /**
   * Get workspace path (supports both team-based and user-based structure)
   */
  private async getWorkspacePath(
    workspaceId: string,
    _userId: string,
    _teamId?: string,
  ): Promise<string> {
    return resolveWorkspacePath(workspaceId)
  }

  /**
   * Setup chokidar watcher event handlers
   */
  private setupWatcherHandlers(
    watcher: FSWatcher,
    workspaceId: string,
    workspacePath: string,
  ): void {
    // File created
    watcher.on('add', async (filePath) => {
      const relativePath = path.relative(workspacePath, filePath)
      const fileType = path.extname(filePath).slice(1)

      // Get file size
      let size: number | undefined
      try {
        const stats = await fs.stat(filePath)
        size = stats.size
      } catch (err) {
        log.debug({ err }, 'File might have been deleted already')
      }

      eventBus.emit('file:created', {
        workspaceId,
        filePath: `/${relativePath}`,
        fileType,
        size,
      })
    })

    // File modified
    watcher.on('change', async (filePath) => {
      const relativePath = path.relative(workspacePath, filePath)
      const fileType = path.extname(filePath).slice(1)

      // Get file size
      let size: number | undefined
      try {
        const stats = await fs.stat(filePath)
        size = stats.size
      } catch (err) {
        log.debug({ err }, 'File might have been deleted already')
      }

      eventBus.emit('file:modified', {
        workspaceId,
        filePath: `/${relativePath}`,
        fileType,
        size,
      })
    })

    // File deleted
    watcher.on('unlink', (filePath) => {
      const relativePath = path.relative(workspacePath, filePath)

      eventBus.emit('file:deleted', {
        workspaceId,
        filePath: `/${relativePath}`,
      })
    })

    // Watcher error
    watcher.on('error', (error) => {
      log.error({ err: error, workspacePath }, 'Error watching workspace')
    })
  }
}

// Export singleton instance with correct storage path
export const fileWatcher = new FileWatcher(STORAGE_BASE_PATH)
