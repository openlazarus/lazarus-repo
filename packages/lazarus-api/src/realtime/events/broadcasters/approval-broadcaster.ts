/**
 * ApprovalBroadcaster - Broadcasts approval events via WebSocket
 *
 * Listens to approval:requested and approval:resolved events from the
 * EventBus and broadcasts them to all workspace members via WebSocket.
 * Approvals are always workspace-scoped (all members should see them).
 */

import { createLogger } from '@utils/logger'
import { eventBus } from '@realtime/events/event-bus'
import { connectionManager } from '@realtime/websocket/connection-manager'
import { ApprovalMessage } from '@realtime/types'

const log = createLogger('approval-broadcaster')

export class ApprovalBroadcaster {
  constructor() {
    this.setupEventListeners()
    log.info('Initialized')
  }

  private setupEventListeners(): void {
    eventBus.on('approval:requested', (payload) => {
      const message: ApprovalMessage = {
        type: 'approval:requested',
        approvalId: payload.approvalId,
        workspaceId: payload.workspaceId,
        agentId: payload.agentId,
        agentName: payload.agentName,
        executionId: payload.executionId,
        toolName: payload.toolName,
        description: payload.description,
        riskLevel: payload.riskLevel,
        createdAt: payload.createdAt,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId: payload.workspaceId })

      log.info(
        {
          approvalId: payload.approvalId,
          agentName: payload.agentName,
          toolName: payload.toolName,
        },
        'Broadcast approval requested',
      )
    })

    eventBus.on('approval:resolved', (payload) => {
      const message: ApprovalMessage = {
        type: 'approval:resolved',
        approvalId: payload.approvalId,
        workspaceId: payload.workspaceId,
        agentId: payload.agentId,
        executionId: payload.executionId,
        approved: payload.approved,
        resolvedBy: payload.resolvedBy,
        timestamp: new Date().toISOString(),
      }

      connectionManager.broadcast(message, { workspaceId: payload.workspaceId })

      log.info(
        {
          approvalId: payload.approvalId,
          approved: payload.approved,
        },
        'Broadcast approval resolved',
      )
    })
  }
}

export const approvalBroadcaster = new ApprovalBroadcaster()
