/**
 * FileBroadcaster - Broadcasts file system events via WebSocket
 *
 * Listens to file events from the EventBus and converts them to
 * WebSocket messages sent via the ConnectionManager.
 */

import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { connectionManager } from '@realtime/websocket/connection-manager'
import { FileMessage } from '@realtime/types'

const log = createLogger('file-broadcaster')

/**
 * FileBroadcaster class
 */
export class FileBroadcaster {
  constructor() {
    this.setupEventListeners()
    log.info('Initialized')
  }

  /**
   * Setup EventBus listeners
   */
  private setupEventListeners(): void {
    // Listen to file created events
    eventBus.on('file:created', ({ workspaceId, filePath, fileType, size, userId }) => {
      const message: FileMessage = {
        type: 'file:created',
        workspace: workspaceId, // Map to frontend field name
        path: filePath, // Map to frontend field name
        fileType,
        size,
        userId,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId })

      log.info({ workspaceId, filePath, userId: userId ?? null }, 'Broadcast file created')
    })

    // Listen to file modified events
    eventBus.on('file:modified', ({ workspaceId, filePath, fileType, size, userId }) => {
      const message: FileMessage = {
        type: 'file:modified',
        workspace: workspaceId, // Map to frontend field name
        path: filePath, // Map to frontend field name
        fileType,
        size,
        userId,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId })

      log.info({ workspaceId, filePath, userId: userId ?? null }, 'Broadcast file modified')
    })

    // Listen to file deleted events
    eventBus.on('file:deleted', ({ workspaceId, filePath }) => {
      const message: FileMessage = {
        type: 'file:deleted',
        workspace: workspaceId, // Map to frontend field name
        path: filePath, // Map to frontend field name
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId })

      log.info({ workspaceId, filePath }, 'Broadcast file deleted')
    })
  }

  /**
   * Broadcast file created event (programmatic API)
   *
   * @param workspaceId - Workspace ID
   * @param filePath - File path
   * @param fileType - Optional file type
   * @param size - Optional file size
   */
  broadcastFileCreated(
    workspaceId: string,
    filePath: string,
    fileType?: string,
    size?: number,
  ): void {
    eventBus.emit('file:created', { workspaceId, filePath, fileType, size })
  }

  /**
   * Broadcast file modified event (programmatic API)
   *
   * @param workspaceId - Workspace ID
   * @param filePath - File path
   * @param fileType - Optional file type
   * @param size - Optional file size
   */
  broadcastFileModified(
    workspaceId: string,
    filePath: string,
    fileType?: string,
    size?: number,
  ): void {
    eventBus.emit('file:modified', { workspaceId, filePath, fileType, size })
  }

  /**
   * Broadcast file deleted event (programmatic API)
   *
   * @param workspaceId - Workspace ID
   * @param filePath - File path
   */
  broadcastFileDeleted(workspaceId: string, filePath: string): void {
    eventBus.emit('file:deleted', { workspaceId, filePath })
  }
}

// Export singleton instance
export const fileBroadcaster = new FileBroadcaster()
