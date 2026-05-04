import { Server as HttpServer } from 'http'
import WebSocket, { WebSocketServer } from 'ws'
import { parse } from 'url'
import { fileWatcherService } from './domains/file/service/file-watcher.service'
import { agentStatusService } from './domains/agent/service/agent-status.service'
import { createLogger } from '@utils/logger'

const log = createLogger('websocket')

export function setupWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true })

  // Handle upgrade requests
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
    const workspaceId = query.workspace as string
    const userId = query.userId as string

    // Route to appropriate handler based on pathname
    if (pathname === '/ws/files') {
      handleFileWatcherConnection(ws, workspaceId, userId)
    } else if (pathname === '/ws/agents') {
      handleAgentStatusConnection(ws, userId, workspaceId)
    } else if (pathname === '/ws/workspace') {
      handleUnifiedWorkspaceConnection(ws, workspaceId, userId)
    } else {
      ws.close(1008, 'Invalid WebSocket path')
    }
  })

  // Handler for file watcher connections
  function handleFileWatcherConnection(ws: WebSocket, workspaceId: string, userId: string): void {
    if (!workspaceId || !userId) {
      log.error({ channel: 'files' }, 'Missing workspace or userId in connection')
      ws.close(1008, 'Missing workspace or userId parameter')
      return
    }

    log.info({ channel: 'files', workspaceId, userId }, 'Client connected')

    // Subscribe to file changes
    fileWatcherService.subscribe(workspaceId, userId, ws)

    // Send initial connection success message
    ws.send(
      JSON.stringify({
        type: 'connection:established',
        workspace: workspaceId,
        timestamp: new Date().toISOString(),
      }),
    )

    // Handle incoming messages (for ping/pong)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())

        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        }
      } catch (error) {
        log.error({ err: error, channel: 'files' }, 'Failed to parse message')
      }
    })

    // Handle errors
    ws.on('error', (error) => {
      log.error({ err: error, channel: 'files' }, 'WebSocket error')
    })

    // Handle close
    ws.on('close', () => {
      log.info({ channel: 'files', workspaceId, userId }, 'Client disconnected')
      fileWatcherService.unsubscribe(workspaceId, userId, ws)
    })
  }

  // Handler for agent status connections
  function handleAgentStatusConnection(ws: WebSocket, userId: string, workspaceId?: string): void {
    if (!userId) {
      log.error({ channel: 'agents' }, 'Missing userId in connection')
      ws.close(1008, 'Missing userId parameter')
      return
    }

    log.info({ channel: 'agents', userId, workspaceId: workspaceId ?? 'none' }, 'Client connected')

    // Subscribe to agent status updates
    agentStatusService.subscribe(ws, userId, workspaceId)

    // Send initial connection success message
    ws.send(
      JSON.stringify({
        type: 'connection:established',
        timestamp: new Date().toISOString(),
      }),
    )

    // Handle incoming messages (for ping/pong)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())

        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        }
      } catch (error) {
        log.error({ err: error, channel: 'agents' }, 'Failed to parse message')
      }
    })

    // Handle errors
    ws.on('error', (error) => {
      log.error({ err: error, channel: 'agents' }, 'WebSocket error')
    })

    // Handle close
    ws.on('close', () => {
      log.info({ channel: 'agents', userId }, 'Client disconnected')
      agentStatusService.unsubscribe(ws)
    })
  }

  // Handler for unified workspace connections (file + agent status)
  function handleUnifiedWorkspaceConnection(
    ws: WebSocket,
    workspaceId: string,
    userId: string,
  ): void {
    if (!userId) {
      log.error({ channel: 'workspace' }, 'Missing userId in connection')
      ws.close(1008, 'Missing userId parameter')
      return
    }

    log.info(
      { channel: 'workspace', workspaceId: workspaceId || 'none', userId },
      'Client connected',
    )

    // Subscribe to agent status updates (always available)
    agentStatusService.subscribe(ws, userId, workspaceId)

    // Subscribe to file changes if workspace is provided
    if (workspaceId) {
      fileWatcherService.subscribe(workspaceId, userId, ws)
    }

    // Send initial connection success message
    ws.send(
      JSON.stringify({
        type: 'connection:established',
        workspace: workspaceId,
        timestamp: new Date().toISOString(),
      }),
    )

    // Handle incoming messages (for ping/pong)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())

        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        }
      } catch (error) {
        log.error({ err: error, channel: 'workspace' }, 'Failed to parse message')
      }
    })

    // Handle errors
    ws.on('error', (error) => {
      log.error({ err: error, channel: 'workspace' }, 'WebSocket error')
    })

    // Handle close
    ws.on('close', () => {
      log.info(
        { channel: 'workspace', workspaceId: workspaceId || 'none', userId },
        'Client disconnected',
      )

      // Unsubscribe from both services
      agentStatusService.unsubscribe(ws)
      if (workspaceId) {
        fileWatcherService.unsubscribe(workspaceId, userId, ws)
      }
    })
  }

  log.info(
    { paths: ['/ws/files', '/ws/agents', '/ws/workspace'] },
    'WebSocket server setup complete',
  )

  // Cleanup on server close
  server.on('close', async () => {
    log.info('Cleaning up file watcher service')
    await fileWatcherService.cleanup()
  })
}
