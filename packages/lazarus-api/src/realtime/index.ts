/**
 * Realtime Module - Unified Public API
 *
 * This is the main entry point for all realtime functionality in Lazarus.
 * It provides a simple, consistent interface for:
 * - Execution tracking and caching
 * - WebSocket broadcasting
 * - Activity logging
 * - File watching
 * - Event bus
 *
 * Usage:
 *   import { realtime } from './realtime';
 *
 *   // Track execution
 *   const tracker = realtime.trackExecution({
 *     type: 'trigger',
 *     agentId: 'agent-123',
 *     userId: 'user-456',
 *   });
 *   tracker.progress(50, 'Processing...').complete();
 *
 *   // Broadcast events
 *   realtime.emit('agent:started', { agentId, userId, metadata });
 *
 *   // Log activity
 *   await realtime.logActivity(activityLog);
 *
 *   // Watch workspace
 *   await realtime.watchWorkspace(workspaceId, userId);
 */

// ============================================================================
// Exports - Core Components
// ============================================================================

// Event Bus
export { eventBus, EventBus } from './events/event-bus'

// Types
export * from './types'
export * from './events/event-types'

// Cache
export { executionCache, ExecutionCache } from './cache/execution-cache'

// WebSocket
export { connectionManager, ConnectionManager } from './websocket/connection-manager'
export {
  setupWebSocketServer,
  shutdown as shutdownWebSocketServer,
  getStats as getWebSocketStats,
} from './websocket/server'

// Broadcasters
export { agentBroadcaster, AgentBroadcaster } from './events/broadcasters/agent-broadcaster'
export {
  executionBroadcaster,
  ExecutionBroadcaster,
} from './events/broadcasters/execution-broadcaster'
export { fileBroadcaster, FileBroadcaster } from './events/broadcasters/file-broadcaster'
export {
  workspaceBroadcaster,
  WorkspaceBroadcaster,
} from './events/broadcasters/workspace-broadcaster'
export { teamBroadcaster, TeamBroadcaster } from './events/broadcasters/team-broadcaster'
export {
  approvalBroadcaster,
  ApprovalBroadcaster,
} from './events/broadcasters/approval-broadcaster'

// File Watcher
export { fileWatcher, FileWatcher } from './file-watcher/file-watcher'

// ============================================================================
// Unified Realtime Service
// ============================================================================

import { eventBus } from './events/event-bus'
import { executionCache } from './cache/execution-cache'
import { agentBroadcaster } from './events/broadcasters/agent-broadcaster'
import { fileBroadcaster } from './events/broadcasters/file-broadcaster'
import { workspaceBroadcaster } from './events/broadcasters/workspace-broadcaster'
import { teamBroadcaster } from './events/broadcasters/team-broadcaster'
import { approvalBroadcaster } from './events/broadcasters/approval-broadcaster'
void approvalBroadcaster // Ensure singleton is instantiated
import { fileWatcher } from './file-watcher/file-watcher'
import { connectionManager } from './websocket/connection-manager'
import { RegisterExecutionParams, ExecutionTracker, AgentStatus } from './types'
import type {
  RealtimeEventType,
  RealtimeEventPayloads,
  RealtimeEventHandler,
} from './events/event-types'

/**
 * Unified Realtime Service
 *
 * Provides a simple, consistent API for all realtime functionality
 */
export class RealtimeService {
  // ============================================================================
  // Execution Tracking
  // ============================================================================

  /**
   * Track a new execution with fluent API
   *
   * @param params - Execution parameters
   * @returns ExecutionTracker for fluent API usage
   *
   * @example
   * const tracker = realtime.trackExecution({
   *   type: 'trigger',
   *   agentId: 'agent-123',
   *   userId: 'user-456',
   *   workspaceId: 'workspace-789',
   * });
   *
   * tracker
   *   .progress(25, 'Starting...')
   *   .progress(50, 'Processing...')
   *   .progress(75, 'Finishing...')
   *   .complete({ result: 'success' });
   */
  trackExecution(params: RegisterExecutionParams): ExecutionTracker {
    return executionCache.register(params)
  }

  /**
   * Get execution cache statistics
   */
  getExecutionStats() {
    return executionCache.getStats()
  }

  // ============================================================================
  // Event Bus
  // ============================================================================

  /**
   * Emit a type-safe event
   *
   * @param event - Event type
   * @param payload - Event payload
   *
   * @example
   * realtime.emit('agent:started', {
   *   agentId: 'agent-123',
   *   userId: 'user-456',
   *   workspaceId: 'workspace-789',
   *   metadata: { title: 'Processing email' }
   * });
   */
  emit<K extends RealtimeEventType>(event: K, payload: RealtimeEventPayloads[K]): boolean {
    return eventBus.emit(event, payload)
  }

  /**
   * Listen to a type-safe event
   *
   * @param event - Event type
   * @param handler - Event handler
   *
   * @example
   * realtime.on('execution:completed', ({ execution, duration }) => {
   *   console.log(`Execution ${execution.id} completed in ${duration}ms`);
   * });
   */
  on<K extends RealtimeEventType>(event: K, handler: RealtimeEventHandler<K>): void {
    eventBus.on(event, handler)
  }

  /**
   * Listen to an event once
   *
   * @param event - Event type
   * @param handler - Event handler
   */
  once<K extends RealtimeEventType>(event: K, handler: RealtimeEventHandler<K>): void {
    eventBus.once(event, handler)
  }

  /**
   * Remove event listener
   *
   * @param event - Event type
   * @param handler - Event handler to remove
   */
  off<K extends RealtimeEventType>(event: K, handler: RealtimeEventHandler<K>): void {
    eventBus.off(event, handler)
  }

  // ============================================================================
  // Broadcasting (Programmatic API)
  // ============================================================================

  /**
   * Broadcast agent status update
   *
   * @param agentId - Agent ID
   * @param status - Agent status
   * @param metadata - Optional metadata
   */
  broadcastAgentStatus(agentId: string, status: AgentStatus, metadata?: any): void {
    agentBroadcaster.broadcastStatus(agentId, status, metadata)
  }

  /**
   * Broadcast agent started event
   *
   * @param agentId - Agent ID
   * @param metadata - Optional metadata
   */
  broadcastAgentStarted(agentId: string, metadata?: any): void {
    agentBroadcaster.broadcastAgentStarted(agentId, metadata)
  }

  /**
   * Broadcast agent stopped event
   *
   * @param agentId - Agent ID
   */
  broadcastAgentStopped(agentId: string): void {
    agentBroadcaster.broadcastAgentStopped(agentId)
  }

  /**
   * Broadcast agent progress event
   *
   * @param agentId - Agent ID
   * @param metadata - Progress metadata
   */
  broadcastAgentProgress(agentId: string, metadata: any): void {
    agentBroadcaster.broadcastAgentProgress(agentId, metadata)
  }

  /**
   * Broadcast agent error event
   *
   * @param agentId - Agent ID
   * @param error - Error message
   */
  broadcastAgentError(agentId: string, error: string): void {
    agentBroadcaster.broadcastAgentError(agentId, error)
  }

  /**
   * Broadcast file change event
   *
   * @param workspaceId - Workspace ID
   * @param filePath - File path
   * @param type - Change type
   */
  broadcastFileChange(
    workspaceId: string,
    filePath: string,
    type: 'created' | 'modified' | 'deleted',
  ): void {
    if (type === 'created') {
      fileBroadcaster.broadcastFileCreated(workspaceId, filePath)
    } else if (type === 'modified') {
      fileBroadcaster.broadcastFileModified(workspaceId, filePath)
    } else if (type === 'deleted') {
      fileBroadcaster.broadcastFileDeleted(workspaceId, filePath)
    }
  }

  /**
   * Broadcast workspace updated event
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param changes - Changes made
   * @param teamId - Optional team ID
   */
  broadcastWorkspaceUpdated(
    workspaceId: string,
    userId: string,
    changes: Record<string, any>,
    teamId?: string,
  ): void {
    workspaceBroadcaster.broadcastWorkspaceUpdated(workspaceId, userId, changes, teamId)
  }

  /**
   * Broadcast team updated event
   *
   * @param teamId - Team ID
   * @param changes - Changes made
   */
  broadcastTeamUpdated(teamId: string, changes: Record<string, any>): void {
    teamBroadcaster.broadcastTeamUpdated(teamId, changes)
  }

  // ============================================================================
  // File Watching
  // ============================================================================

  /**
   * Start watching a workspace for file changes
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @param teamId - Optional team ID
   *
   * @example
   * await realtime.watchWorkspace('workspace-123', 'user-456');
   */
  async watchWorkspace(workspaceId: string, userId: string, teamId?: string): Promise<void> {
    return fileWatcher.watchWorkspace(workspaceId, userId, teamId)
  }

  /**
   * Stop watching a workspace
   *
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   */
  async unwatchWorkspace(workspaceId: string, userId: string): Promise<void> {
    return fileWatcher.unwatchWorkspace(workspaceId, userId)
  }

  /**
   * Get file watcher statistics
   */
  getFileWatcherStats() {
    return fileWatcher.getStats()
  }

  // ============================================================================
  // WebSocket Connections
  // ============================================================================

  /**
   * Get WebSocket connection statistics
   */
  getConnectionStats() {
    return connectionManager.getStats()
  }

  /**
   * Get total connection count
   */
  getConnectionCount(): number {
    return connectionManager.getConnectionCount()
  }

  // ============================================================================
  // Overall Statistics
  // ============================================================================

  /**
   * Get comprehensive realtime statistics
   */
  getStats() {
    return {
      connections: connectionManager.getStats(),
      executions: executionCache.getStats(),
      fileWatchers: fileWatcher.getStats(),
      events: eventBus.getStats(),
    }
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

/**
 * Singleton realtime service instance
 *
 * This is the main interface for all realtime functionality
 */
export const realtime = new RealtimeService()

// Also export as default
export default realtime
