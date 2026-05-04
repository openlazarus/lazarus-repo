/**
 * WorkspaceBroadcaster - Broadcasts workspace events via WebSocket
 *
 * Listens to workspace events from the EventBus and converts them to
 * WebSocket messages sent via the ConnectionManager.
 */

import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { connectionManager } from '@realtime/websocket/connection-manager'
import { WorkspaceMessage, ActivityMessage } from '@realtime/types'

const log = createLogger('workspace-broadcaster')

/**
 * WorkspaceBroadcaster class
 */
export class WorkspaceBroadcaster {
  constructor() {
    this.setupEventListeners()
    log.info('Initialized')
  }

  /**
   * Setup EventBus listeners
   */
  private setupEventListeners(): void {
    // Listen to workspace updated events
    eventBus.on('workspace:updated', ({ workspaceId, userId, teamId, changes }) => {
      const message: WorkspaceMessage = {
        type: 'workspace:updated',
        workspaceId,
        changes,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId, userId, teamId })

      log.info({ workspaceId }, 'Broadcast workspace updated')
    })

    // Listen to workspace loaded events (internal notification)
    eventBus.on('workspace:loaded', ({ workspaceId, userId, teamId }) => {
      log.info({ workspaceId, userId, teamId: teamId ?? null }, 'Workspace loaded')
      // This is an internal event, no WebSocket broadcast needed
    })

    // Listen to workspace unloaded events (internal notification)
    eventBus.on('workspace:unloaded', ({ workspaceId }) => {
      log.info({ workspaceId }, 'Workspace unloaded')
      // This is an internal event, no WebSocket broadcast needed
    })

    // Listen to activity new events
    eventBus.on('activity:new', ({ workspaceId, activityId, activityType, actorName, title }) => {
      const message: ActivityMessage = {
        type: 'activity:new',
        workspaceId,
        activityId,
        activityType,
        actorName,
        title,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId })

      log.info({ workspaceId, activityId }, 'Broadcast activity new')
    })
  }

  /**
   * Broadcast workspace updated event (programmatic API)
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param changes - Changes made to workspace
   * @param teamId - Optional team ID
   */
  broadcastWorkspaceUpdated(
    workspaceId: string,
    userId: string,
    changes: Record<string, any>,
    teamId?: string,
  ): void {
    eventBus.emit('workspace:updated', { workspaceId, userId, teamId, changes })
  }

  /**
   * Broadcast activity new event (programmatic API)
   *
   * @param workspaceId - Workspace ID
   * @param activityId - Activity ID
   * @param activityType - Activity type
   * @param actorName - Actor name
   * @param title - Activity title
   */
  broadcastActivityNew(
    workspaceId: string,
    activityId: string,
    activityType: string,
    actorName: string,
    title: string,
  ): void {
    eventBus.emit('activity:new', {
      workspaceId,
      activityId,
      activityType,
      actorName,
      title,
    })
  }
}

// Export singleton instance
export const workspaceBroadcaster = new WorkspaceBroadcaster()
