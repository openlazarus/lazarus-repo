/**
 * ConnectionManager - WebSocket connection pool and scoped broadcasting
 *
 * Manages all WebSocket connections and provides scoped message broadcasting
 * based on userId, workspaceId, teamId, and custom filters.
 *
 * Usage:
 *   connectionManager.subscribe(ws, { userId, workspaceId });
 *   connectionManager.broadcast(message, { workspaceId });
 */

import WebSocket from 'ws'
import { createLogger } from '@utils/logger'
import { SubscriptionContext, EventScope, WebSocketMessage } from '@realtime/types'

const log = createLogger('connection-manager')

/**
 * ConnectionManager class
 */
export class ConnectionManager {
  /** All active subscriptions */
  private subscriptions: Set<SubscriptionContext> = new Set()

  /** Heartbeat interval (30 seconds) */
  private readonly HEARTBEAT_INTERVAL_MS = 30 * 1000

  /** Heartbeat timer */
  private heartbeatTimer?: NodeJS.Timeout

  constructor() {
    this.startHeartbeat()
    log.info('Initialized')
  }

  /**
   * Subscribe a WebSocket client
   *
   * @param ws - WebSocket connection
   * @param context - Subscription context (userId, workspaceId, etc.)
   */
  subscribe(ws: WebSocket, context: Omit<SubscriptionContext, 'ws'>): void {
    const subscription: SubscriptionContext = {
      ws,
      ...context,
    }

    this.subscriptions.add(subscription)

    log.info(
      {
        userId: context.userId,
        workspaceId: context.workspaceId ?? null,
        teamId: context.teamId ?? null,
        totalConnections: this.subscriptions.size,
      },
      'Client subscribed',
    )

    // Send connection established message
    this.sendToClient(ws, {
      type: 'connection:established',
      timestamp: new Date().toISOString(),
      message: 'Connected to Lazarus realtime service',
    })

    // Setup WebSocket event handlers
    this.setupWebSocketHandlers(ws, subscription)
  }

  /**
   * Unsubscribe a WebSocket client
   *
   * @param ws - WebSocket connection to remove
   */
  unsubscribe(ws: WebSocket): void {
    const subscription = Array.from(this.subscriptions).find((s) => s.ws === ws)

    if (subscription) {
      this.subscriptions.delete(subscription)
      log.info(
        {
          userId: subscription.userId,
          workspaceId: subscription.workspaceId ?? null,
          totalConnections: this.subscriptions.size,
        },
        'Client unsubscribed',
      )
    }
  }

  /**
   * Broadcast a message to all matching clients
   *
   * @param message - WebSocket message to send
   * @param scope - Optional scope to filter recipients
   */
  broadcast(message: WebSocketMessage, scope?: EventScope): void {
    const messageStr = JSON.stringify(message)
    let successCount = 0
    let filteredCount = 0
    let failureCount = 0

    // Log broadcast attempt for agent/execution messages
    const isAgentMsg = message.type.startsWith('agent:') || message.type.startsWith('execution:')
    if (isAgentMsg) {
      log.info(
        {
          messageType: message.type,
          scopeUserId: scope?.userId,
          scopeWorkspaceId: scope?.workspaceId,
          scopeAgentId: scope?.agentId,
          totalSubscriptions: this.subscriptions.size,
        },
        'Broadcasting',
      )
    }

    for (const subscription of this.subscriptions) {
      // Check if subscription matches scope
      if (scope && !this.matchesScope(subscription, scope)) {
        if (isAgentMsg) {
          log.info(
            {
              reason: 'scope',
              userId: subscription.userId,
              workspaceId: subscription.workspaceId ?? null,
              eventTypeFilters: subscription.filters?.eventTypes?.join(',') ?? null,
            },
            'Subscription filtered',
          )
        }
        filteredCount++
        continue
      }

      // Check if subscription matches message filters
      if (!this.matchesFilters(subscription, message)) {
        if (isAgentMsg) {
          log.info(
            {
              reason: 'messageType',
              userId: subscription.userId,
              workspaceId: subscription.workspaceId ?? null,
              eventTypeFilters: subscription.filters?.eventTypes?.join(',') ?? null,
            },
            'Subscription filtered',
          )
        }
        filteredCount++
        continue
      }

      // Send message
      if (subscription.ws.readyState === WebSocket.OPEN) {
        try {
          subscription.ws.send(messageStr)
          if (isAgentMsg) {
            log.info(
              {
                userId: subscription.userId,
                workspaceId: subscription.workspaceId ?? null,
              },
              'Message sent to subscription',
            )
          }
          successCount++
        } catch (error) {
          log.error({ err: error }, 'Error sending message')
          failureCount++
        }
      } else {
        // Remove dead connections
        this.subscriptions.delete(subscription)
        failureCount++
      }
    }

    if (isAgentMsg || process.env.DEBUG_WEBSOCKET === 'true') {
      log.info(
        {
          messageType: message.type,
          successCount,
          filteredCount,
          failureCount,
        },
        'Broadcast complete',
      )
    }
  }

  /**
   * Send a message to a specific client
   *
   * @param ws - WebSocket connection
   * @param message - Message to send
   */
  sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message))
      } catch (error) {
        log.error({ err: error }, 'Error sending to client')
      }
    }
  }

  /**
   * Get all subscriptions for a specific user
   *
   * @param userId - User ID
   */
  getByUser(userId: string): SubscriptionContext[] {
    return Array.from(this.subscriptions).filter((s) => s.userId === userId)
  }

  /**
   * Get all subscriptions for a specific workspace
   *
   * @param workspaceId - Workspace ID
   */
  getByWorkspace(workspaceId: string): SubscriptionContext[] {
    return Array.from(this.subscriptions).filter((s) => s.workspaceId === workspaceId)
  }

  /**
   * Get all subscriptions for a specific team
   *
   * @param teamId - Team ID
   */
  getByTeam(teamId: string): SubscriptionContext[] {
    return Array.from(this.subscriptions).filter((s) => s.teamId === teamId)
  }

  /**
   * Get total number of active connections
   */
  getConnectionCount(): number {
    return this.subscriptions.size
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number
    byUser: Record<string, number>
    byWorkspace: Record<string, number>
    byTeam: Record<string, number>
  } {
    const stats = {
      totalConnections: this.subscriptions.size,
      byUser: {} as Record<string, number>,
      byWorkspace: {} as Record<string, number>,
      byTeam: {} as Record<string, number>,
    }

    for (const subscription of this.subscriptions) {
      // Count by user
      stats.byUser[subscription.userId] = (stats.byUser[subscription.userId] || 0) + 1

      // Count by workspace
      if (subscription.workspaceId) {
        stats.byWorkspace[subscription.workspaceId] =
          (stats.byWorkspace[subscription.workspaceId] || 0) + 1
      }

      // Count by team
      if (subscription.teamId) {
        stats.byTeam[subscription.teamId] = (stats.byTeam[subscription.teamId] || 0) + 1
      }
    }

    return stats
  }

  /**
   * Check if a subscription matches a scope
   *
   * @param subscription - Subscription context
   * @param scope - Event scope
   */
  private matchesScope(subscription: SubscriptionContext, scope: EventScope): boolean {
    // Check userId
    if (scope.userId && subscription.userId !== scope.userId) {
      return false
    }

    // Check workspaceId - fail-closed: if scope specifies a workspace,
    // subscription MUST also specify a matching workspace
    if (scope.workspaceId) {
      if (!subscription.workspaceId || subscription.workspaceId !== scope.workspaceId) {
        return false
      }
    }

    // Check teamId - fail-closed: if scope specifies a team,
    // subscription MUST also specify a matching team
    if (scope.teamId) {
      if (!subscription.teamId || subscription.teamId !== scope.teamId) {
        return false
      }
    }

    // Check agentId (if subscription has agent filter)
    if (scope.agentId && subscription.filters?.agentIds) {
      if (!subscription.filters.agentIds.includes(scope.agentId)) {
        return false
      }
    }

    return true
  }

  /**
   * Check if a subscription matches message filters
   *
   * @param subscription - Subscription context
   * @param message - WebSocket message
   */
  private matchesFilters(subscription: SubscriptionContext, message: WebSocketMessage): boolean {
    // No filters = receive all messages
    if (!subscription.filters) {
      return true
    }

    // Filter by event type
    if (subscription.filters.eventTypes && subscription.filters.eventTypes.length > 0) {
      if (!subscription.filters.eventTypes.includes(message.type)) {
        return false
      }
    }

    // Filter by agent ID (for agent-related messages)
    if (subscription.filters.agentIds && subscription.filters.agentIds.length > 0) {
      if ('agentId' in message && message.agentId) {
        if (!subscription.filters.agentIds.includes(message.agentId)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Setup WebSocket event handlers
   *
   * @param ws - WebSocket connection
   * @param subscription - Subscription context
   */
  private setupWebSocketHandlers(ws: WebSocket, _subscription: SubscriptionContext): void {
    // Handle close
    ws.on('close', () => {
      this.unsubscribe(ws)
    })

    // Handle error
    ws.on('error', (error) => {
      log.error({ err: error }, 'WebSocket error')
      this.unsubscribe(ws)
    })

    // Handle ping/pong for keep-alive
    ws.on('ping', () => {
      ws.pong()
    })

    ws.on('pong', () => {
      // Client is alive
    })

    // Handle incoming messages (for future bidirectional communication)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Handle ping from client
        if (message.type === 'ping') {
          this.sendToClient(ws, {
            type: 'connection:pong',
            timestamp: new Date().toISOString(),
          })
        }
      } catch (error) {
        log.error({ err: error }, 'Error parsing client message')
      }
    })
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.cleanupDeadConnections()
    }, this.HEARTBEAT_INTERVAL_MS)
  }

  /**
   * Stop heartbeat timer
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * Clean up dead WebSocket connections
   */
  private cleanupDeadConnections(): void {
    let removed = 0

    for (const subscription of this.subscriptions) {
      if (subscription.ws.readyState !== WebSocket.OPEN) {
        this.subscriptions.delete(subscription)
        removed++
      }
    }

    if (removed > 0) {
      log.info({ removed }, 'Cleaned up dead connections')
    }
  }

  /**
   * Shutdown the connection manager
   */
  shutdown(): void {
    log.info('Shutting down')

    // Stop heartbeat
    this.stopHeartbeat()

    // Close all connections
    for (const subscription of this.subscriptions) {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        subscription.ws.close()
      }
    }

    this.subscriptions.clear()
    log.info('Shutdown complete')
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager()
