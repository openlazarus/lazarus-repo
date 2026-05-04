/**
 * WebSocket Server - Unified WebSocket server for all real-time features
 *
 * Migrated from src/api/websocket.ts
 * Now integrated with the unified realtime architecture
 *
 * Handles HTTP upgrade requests and routes connections to the ConnectionManager
 * Supports multiple WebSocket endpoints:
 * - /ws/workspace - Unified endpoint (recommended)
 * - /ws/agents - Agent status only (backward compatible)
 * - /ws/files - File changes only (backward compatible)
 */

import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { parse } from 'url'
import { createLogger } from '@utils/logger'
import { connectionManager } from './connection-manager'
import { fileWatcher } from '@realtime/file-watcher/file-watcher'
import { executionCache } from '@realtime/cache/execution-cache'

const log = createLogger('ws-server')

/**
 * Setup WebSocket server on HTTP server
 *
 * @param server - HTTP server instance
 */
export function setupWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true })

  log.info('Setting up WebSocket server')

  // Handle HTTP upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true)

    // Handle /ws/files, /ws/agents, and unified /ws/workspace paths
    if (pathname === '/ws/files' || pathname === '/ws/agents' || pathname === '/ws/workspace') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, query, pathname)
      })
    } else {
      socket.destroy()
    }
  })

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket, _request: any, query: any, pathname: string) => {
    const rawWorkspaceId = query.workspace as string
    const userId = query.userId as string
    const teamId = query.teamId as string

    // Validate workspace ID format - reject UUIDs (userId accidentally passed as workspace)
    // Workspace IDs use formats like ws_xxx, workspace-xxx, lazarus-team-xxx — never UUIDs
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const workspaceId = rawWorkspaceId && !UUID_RE.test(rawWorkspaceId) ? rawWorkspaceId : undefined

    // Route to appropriate handler based on pathname
    if (pathname === '/ws/files') {
      handleFileWatcherConnection(ws, workspaceId ?? '', userId ?? '', teamId ?? '')
    } else if (pathname === '/ws/agents') {
      handleAgentStatusConnection(ws, userId ?? '', workspaceId ?? '', teamId ?? '')
    } else if (pathname === '/ws/workspace') {
      handleUnifiedWorkspaceConnection(ws, workspaceId ?? '', userId ?? '', teamId ?? '')
    } else {
      ws.close(1008, 'Invalid WebSocket path')
    }
  })

  log.info(
    { paths: ['/ws/files', '/ws/agents', '/ws/workspace'] },
    'WebSocket server setup complete',
  )

  // Cleanup on server close
  server.on('close', async () => {
    log.info('Server closing, cleaning up')
    await shutdown()
  })
}

/**
 * Handler for file watcher connections (/ws/files)
 * Backward compatible endpoint
 */
function handleFileWatcherConnection(
  ws: WebSocket,
  workspaceId: string,
  userId: string,
  teamId?: string,
): void {
  if (!workspaceId || !userId) {
    log.error('Missing workspace or userId in file watcher connection')
    ws.close(1008, 'Missing workspace or userId parameter')
    return
  }

  log.info({ channel: 'files', workspaceId, userId }, 'Client connected')

  // Subscribe to ConnectionManager with file event filters
  connectionManager.subscribe(ws, {
    userId,
    workspaceId,
    teamId,
    filters: {
      eventTypes: ['file:created', 'file:modified', 'file:deleted'],
    },
  })

  // Start watching workspace
  fileWatcher.watchWorkspace(workspaceId, userId, teamId).catch((error) => {
    log.error({ err: error, workspaceId }, 'Failed to start watching workspace')
    ws.close(1011, 'Failed to start watching workspace')
  })

  // Handle close - stop watching when connection closes
  ws.on('close', () => {
    log.info({ channel: 'files', workspaceId, userId }, 'Client disconnected')
    fileWatcher.unwatchWorkspace(workspaceId, userId)
  })
}

/**
 * Handler for agent status connections (/ws/agents)
 * Backward compatible endpoint
 */
function handleAgentStatusConnection(
  ws: WebSocket,
  userId: string,
  workspaceId?: string,
  teamId?: string,
): void {
  if (!userId) {
    log.error('Missing userId in agent status connection')
    ws.close(1008, 'Missing userId parameter')
    return
  }

  log.info({ channel: 'agents', userId, workspaceId: workspaceId ?? null }, 'Client connected')

  // Subscribe to ConnectionManager with agent/execution event filters
  connectionManager.subscribe(ws, {
    userId,
    workspaceId,
    teamId,
    filters: {
      eventTypes: [
        'agent:status',
        'agent:started',
        'agent:stopped',
        'agent:progress',
        'agent:error',
        'execution:registered',
        'execution:updated',
        'execution:completed',
        'execution:failed',
      ],
    },
  })

  // Send initial state to client
  sendInitialState(ws, userId, workspaceId)

  // Handle close
  ws.on('close', () => {
    log.info({ channel: 'agents', userId }, 'Client disconnected')
  })
}

/**
 * Handler for unified workspace connections (/ws/workspace)
 * Recommended endpoint - receives all workspace events
 */
function handleUnifiedWorkspaceConnection(
  ws: WebSocket,
  workspaceId: string,
  userId: string,
  teamId?: string,
): void {
  if (!userId) {
    log.error('Missing userId in unified workspace connection')
    ws.close(1008, 'Missing userId parameter')
    return
  }

  log.info({ channel: 'workspace', workspaceId: workspaceId || null, userId }, 'Client connected')

  // Subscribe to ConnectionManager (all events)
  connectionManager.subscribe(ws, {
    userId,
    workspaceId,
    teamId,
    // No filters - receive all events
  })

  // Start watching workspace if provided
  if (workspaceId) {
    fileWatcher.watchWorkspace(workspaceId, userId, teamId).catch((error) => {
      log.error({ err: error, workspaceId }, 'Failed to start watching workspace')
    })
  }

  // Send initial state to client
  sendInitialState(ws, userId, workspaceId)

  // Handle close
  ws.on('close', () => {
    log.info(
      { channel: 'workspace', workspaceId: workspaceId || null, userId },
      'Client disconnected',
    )

    // Stop watching workspace
    if (workspaceId) {
      fileWatcher.unwatchWorkspace(workspaceId, userId)
    }
  })
}

/**
 * Send initial state to a newly connected client
 *
 * @param ws - WebSocket connection
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID
 */
function sendInitialState(ws: WebSocket, userId: string, workspaceId?: string): void {
  // Get running executions for this user/workspace
  let executions = executionCache.getRunning()

  // Filter by workspace if provided
  if (workspaceId) {
    executions = executions.filter((exec) => exec.workspaceId === workspaceId)
  } else {
    // Otherwise filter by user
    executions = executions.filter((exec) => exec.userId === userId)
  }

  // Send each execution as agent:progress message for backward compatibility
  for (const execution of executions) {
    const message = {
      type: 'agent:progress',
      agentId: execution.agentId,
      status: 'executing',
      metadata: {
        taskId: execution.id,
        title: execution.metadata.title || `${execution.type} execution`,
        description: execution.metadata.description,
        workspace: execution.workspaceId,
        trigger: execution.metadata.triggerId,
        emailId: execution.metadata.emailId,
        progress: execution.metadata.progress,
        startedAt: execution.startedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  if (executions.length > 0) {
    log.info({ runningCount: executions.length }, 'Sent initial state')
  }
}

/**
 * Shutdown WebSocket server and cleanup resources
 */
export async function shutdown(): Promise<void> {
  log.info('Shutting down')

  // Stop all file watchers
  await fileWatcher.cleanup()

  // Close all WebSocket connections
  connectionManager.shutdown()

  // Stop execution cache cleanup
  executionCache.stopCleanup()

  log.info('Shutdown complete')
}

/**
 * Get WebSocket server statistics
 */
export function getStats(): {
  connections: number
  watchers: number
  executions: number
} {
  return {
    connections: connectionManager.getConnectionCount(),
    watchers: fileWatcher.getWatcherCount(),
    executions: executionCache.getRunning().length,
  }
}
