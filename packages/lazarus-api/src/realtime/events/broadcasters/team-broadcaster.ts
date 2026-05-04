/**
 * TeamBroadcaster - Broadcasts team events via WebSocket
 *
 * Listens to team events from the EventBus and converts them to
 * WebSocket messages sent via the ConnectionManager.
 */

import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { connectionManager } from '@realtime/websocket/connection-manager'
import { TeamMessage } from '@realtime/types'

const log = createLogger('team-broadcaster')

/**
 * TeamBroadcaster class
 */
export class TeamBroadcaster {
  constructor() {
    this.setupEventListeners()
    log.info('Initialized')
  }

  /**
   * Setup EventBus listeners
   */
  private setupEventListeners(): void {
    // Listen to team updated events
    eventBus.on('team:updated', ({ teamId, changes }) => {
      const message: TeamMessage = {
        type: 'team:updated',
        teamId,
        changes,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { teamId })

      log.info({ teamId }, 'Broadcast team updated')
    })

    // Listen to team member added events (internal notification)
    eventBus.on('team:member-added', ({ teamId, userId, role }) => {
      log.info({ teamId, userId, role }, 'Team member added')

      // Broadcast team update to all team members
      this.broadcastTeamUpdated(teamId, {
        action: 'member_added',
        userId,
        role,
      })
    })

    // Listen to team member removed events (internal notification)
    eventBus.on('team:member-removed', ({ teamId, userId }) => {
      log.info({ teamId, userId }, 'Team member removed')

      // Broadcast team update to all team members
      this.broadcastTeamUpdated(teamId, {
        action: 'member_removed',
        userId,
      })
    })
  }

  /**
   * Broadcast team updated event (programmatic API)
   *
   * @param teamId - Team ID
   * @param changes - Changes made to team
   */
  broadcastTeamUpdated(teamId: string, changes: Record<string, any>): void {
    eventBus.emit('team:updated', { teamId, changes })
  }

  /**
   * Broadcast team member added event (programmatic API)
   *
   * @param teamId - Team ID
   * @param userId - User ID
   * @param role - User role in team
   */
  broadcastMemberAdded(teamId: string, userId: string, role: string): void {
    eventBus.emit('team:member-added', { teamId, userId, role })
  }

  /**
   * Broadcast team member removed event (programmatic API)
   *
   * @param teamId - Team ID
   * @param userId - User ID
   */
  broadcastMemberRemoved(teamId: string, userId: string): void {
    eventBus.emit('team:member-removed', { teamId, userId })
  }
}

// Export singleton instance
export const teamBroadcaster = new TeamBroadcaster()
