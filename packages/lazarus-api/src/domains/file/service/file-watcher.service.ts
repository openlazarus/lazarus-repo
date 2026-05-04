import chokidar, { FSWatcher } from 'chokidar'
import * as path from 'path'
import WebSocket from 'ws'
import type { FileChangeEvent, WorkspaceSubscription } from '@domains/file/types/file.types'
import type { IFileWatcherService } from './file-watcher.service.interface'
import { createLogger } from '@utils/logger'
const log = createLogger('file-watcher')

export class FileWatcherService implements IFileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map()
  private subscriptions: Map<string, Set<WorkspaceSubscription>> = new Map()
  private storageBasePath: string

  constructor(storageBasePath: string = './storage') {
    this.storageBasePath = storageBasePath
  }

  /**
   * Subscribe a WebSocket client to workspace file changes
   */
  subscribe(workspaceId: string, userId: string, ws: WebSocket): void {
    const key = `${userId}:${workspaceId}`

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set())
    }

    const subscription: WorkspaceSubscription = { workspaceId, userId, ws }
    this.subscriptions.get(key)!.add(subscription)

    log.info(`Client subscribed to workspace: ${workspaceId}`)

    // Start watching this workspace if not already watching
    this.startWatching(workspaceId, userId)

    // Handle WebSocket close
    ws.on('close', () => {
      this.unsubscribe(workspaceId, userId, ws)
    })
  }

  /**
   * Unsubscribe a WebSocket client from workspace file changes
   */
  unsubscribe(workspaceId: string, userId: string, ws: WebSocket): void {
    const key = `${userId}:${workspaceId}`
    const subs = this.subscriptions.get(key)

    if (subs) {
      // Remove the specific subscription
      for (const sub of subs) {
        if (sub.ws === ws) {
          subs.delete(sub)
          break
        }
      }

      // If no more subscribers, stop watching
      if (subs.size === 0) {
        this.subscriptions.delete(key)
        this.stopWatching(workspaceId, userId)
      }
    }

    log.info(`Client unsubscribed from workspace: ${workspaceId}`)
  }

  /**
   * Start watching a workspace for file changes
   */
  private startWatching(workspaceId: string, userId: string): void {
    const key = `${userId}:${workspaceId}`

    if (this.watchers.has(key)) {
      return // Already watching
    }

    const workspacePath = path.join(
      this.storageBasePath,
      'users',
      userId,
      'workspaces',
      workspaceId,
    )

    log.info(`Starting to watch: ${workspacePath}`)

    const watcher = chokidar.watch(workspacePath, {
      ignored: /(^|[/\\])\../, // Ignore dotfiles and .versions directory
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    })

    // File created
    watcher.on('add', (filePath) => {
      const relativePath = path.relative(workspacePath, filePath)
      this.notifySubscribers(workspaceId, userId, {
        type: 'file:created',
        workspace: workspaceId,
        path: `/${relativePath}`,
        timestamp: new Date().toISOString(),
        fullPath: filePath,
      })
    })

    // File modified
    watcher.on('change', (filePath) => {
      const relativePath = path.relative(workspacePath, filePath)
      this.notifySubscribers(workspaceId, userId, {
        type: 'file:modified',
        workspace: workspaceId,
        path: `/${relativePath}`,
        timestamp: new Date().toISOString(),
        fullPath: filePath,
      })
    })

    // File deleted
    watcher.on('unlink', (filePath) => {
      const relativePath = path.relative(workspacePath, filePath)
      this.notifySubscribers(workspaceId, userId, {
        type: 'file:deleted',
        workspace: workspaceId,
        path: `/${relativePath}`,
        timestamp: new Date().toISOString(),
        fullPath: filePath,
      })
    })

    watcher.on('error', (error) => {
      log.error({ err: error }, `Error watching ${workspacePath}:`)
    })

    this.watchers.set(key, watcher)
  }

  /**
   * Stop watching a workspace
   */
  private async stopWatching(workspaceId: string, userId: string): Promise<void> {
    const key = `${userId}:${workspaceId}`
    const watcher = this.watchers.get(key)

    if (watcher) {
      await watcher.close()
      this.watchers.delete(key)
      log.info(`Stopped watching workspace: ${workspaceId}`)
    }
  }

  /**
   * Notify all subscribers of a file change
   */
  private notifySubscribers(workspaceId: string, userId: string, event: FileChangeEvent): void {
    const key = `${userId}:${workspaceId}`
    const subs = this.subscriptions.get(key)

    if (!subs) {
      return
    }

    const message = JSON.stringify(event)
    log.info({ data: event.type }, `Notifying ${subs.size} subscribers:`)

    for (const sub of subs) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.send(message)
      }
    }
  }

  /**
   * Manually trigger a file change notification
   * Useful for notifying about changes made via API
   */
  notifyFileChange(
    workspaceId: string,
    userId: string,
    filePath: string,
    type: 'file:created' | 'file:modified' | 'file:deleted',
  ): void {
    const event: FileChangeEvent = {
      type,
      workspace: workspaceId,
      path: filePath,
      timestamp: new Date().toISOString(),
    }

    this.notifySubscribers(workspaceId, userId, event)
  }

  /**
   * Get active subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size
  }

  /**
   * Cleanup all watchers and subscriptions
   */
  async cleanup(): Promise<void> {
    log.info('Cleaning up all watchers...')

    for (const [key, watcher] of this.watchers) {
      await watcher.close()
      log.info(`Closed watcher: ${key}`)
    }

    this.watchers.clear()
    this.subscriptions.clear()
  }
}

// Export singleton instance
export const fileWatcherService: IFileWatcherService = new FileWatcherService()
