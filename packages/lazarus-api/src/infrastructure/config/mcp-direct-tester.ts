import { spawn } from 'child_process'
import fetch from 'node-fetch'
import { MCPServerConfig } from '@shared/types/index'
import { createLogger } from '@utils/logger'

const log = createLogger('mcp-direct-tester')

export interface MCPTestResult {
  connected: boolean
  latencyMs?: number
  transport?: 'stdio' | 'http' | 'sse'
  toolsCount?: number
  tools?: Array<{
    name: string
    description: string
    inputSchema?: any
  }>
  resourcesCount?: number
  resources?: Array<{
    uri: string
    name: string
    description: string
  }>
  serverInfo?: {
    name: string
    version: string
    protocolVersion?: string
  }
  error?: string
  credentialsValid?: boolean
  credentialsError?: string
  validationTool?: string
}

const READ_ONLY_NAME_PATTERN =
  /^(list|get|search|read|fetch|query|describe|show|count|check|status|ping|health|info|version|whoami|me)[_-]?/i

const AUTH_ERROR_PATTERNS = [
  /\bunauthorized\b/i,
  /\bauthentication failed\b/i,
  /\binvalid[.\s_-]*(token|key|credential|api.?key|access.?token)\b/i,
  /\b(expired|revoked)[.\s_-]*(token|key|credential)\b/i,
  /\baccess denied\b/i,
  /\bpermission denied\b/i,
  /\bforbidden\b/i,
  /\b401\b/,
  /\b403\b/,
  /\bnot authenticated\b/i,
  /\binvalid credentials\b/i,
  /\bapi key\b.*\b(invalid|expired|missing)\b/i,
]

function selectValidationTool(
  tools: Array<{ name: string; description?: string; inputSchema?: any; annotations?: any }>,
): { name: string; inputSchema?: any } | null {
  if (!tools || tools.length === 0) return null

  const hasNoRequiredParams = (tool: any): boolean => {
    if (!tool.inputSchema?.properties || Object.keys(tool.inputSchema.properties).length === 0)
      return true
    if (!tool.inputSchema.required || tool.inputSchema.required.length === 0) return true
    return false
  }

  const isReadOnlyHint = (tool: any): boolean => tool.annotations?.readOnlyHint === true
  const isReadOnlyName = (tool: any): boolean => READ_ONLY_NAME_PATTERN.test(tool.name)

  // Priority 1: readOnlyHint + no required params
  for (const tool of tools) {
    if (isReadOnlyHint(tool) && hasNoRequiredParams(tool)) return tool
  }
  // Priority 2: readOnlyHint + has required params
  for (const tool of tools) {
    if (isReadOnlyHint(tool)) return tool
  }
  // Priority 3: read-only name pattern + no required params
  for (const tool of tools) {
    if (isReadOnlyName(tool) && hasNoRequiredParams(tool)) return tool
  }
  // Priority 4: any tool with no required params
  for (const tool of tools) {
    if (hasNoRequiredParams(tool)) return tool
  }

  return null
}

function classifyCredentialResponse(response: any): { valid: boolean | undefined; error?: string } {
  if (!response) return { valid: undefined }

  // JSON-RPC error
  if (response.error) {
    const code = response.error.code
    const msg = typeof response.error.message === 'string' ? response.error.message : ''
    // Auth-specific error codes
    if (code === -32001 || code === -32002) {
      return { valid: false, error: msg || 'Authentication error' }
    }
    // Check message for auth patterns
    if (AUTH_ERROR_PATTERNS.some((p) => p.test(msg))) {
      return { valid: false, error: msg }
    }
    // Non-auth error means credentials worked but tool failed
    return { valid: true }
  }

  // Success result — check content for auth errors
  if (response.result) {
    const contents = response.result.content
    if (Array.isArray(contents)) {
      for (const item of contents) {
        const text = typeof item.text === 'string' ? item.text : ''
        // isError flag + auth pattern = credential failure
        if (response.result.isError || item.isError) {
          if (AUTH_ERROR_PATTERNS.some((p) => p.test(text))) {
            return { valid: false, error: text.substring(0, 300) }
          }
          // Non-auth error = credentials valid
          return { valid: true }
        }
        // Even without isError, check for auth patterns in text
        if (AUTH_ERROR_PATTERNS.some((p) => p.test(text))) {
          return { valid: false, error: text.substring(0, 300) }
        }
      }
    }
    return { valid: true }
  }

  return { valid: undefined }
}

export class MCPDirectTester {
  private static messageId = 0

  /**
   * Test an MCP server by attempting to connect and retrieve available tools
   * Supports both stdio (command-based) and HTTP/SSE (URL-based) servers
   */
  static async testMCPServerDirect(
    serverConfig: MCPServerConfig | { url: string; headers?: Record<string, string> },
    extraEnv?: Record<string, string>,
  ): Promise<MCPTestResult> {
    // Detect if this is a URL-based server
    if ('url' in serverConfig && serverConfig.url) {
      return this.testHttpServer(serverConfig as { url: string; headers?: Record<string, string> })
    }

    // Otherwise, treat as stdio server
    return this.testStdioServer(serverConfig as MCPServerConfig, extraEnv)
  }

  /**
   * Test HTTP/SSE-based MCP server
   */
  static async testHttpServer(config: {
    url: string
    headers?: Record<string, string>
  }): Promise<MCPTestResult> {
    const startTime = Date.now()

    try {
      // Initialize session
      const initRequest = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'mcp-direct-tester',
            version: '1.0.0',
          },
        },
        id: ++this.messageId,
      }

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...config.headers,
      }

      const initResponse = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(initRequest),
      })

      if (!initResponse.ok) {
        return {
          connected: false,
          transport: 'http',
          error: `HTTP error: ${initResponse.status} ${initResponse.statusText}`,
        }
      }

      const contentType = initResponse.headers.get('content-type')
      let serverInfo: any = undefined
      let sessionId: string | undefined

      // Handle response based on content type
      if (contentType?.includes('application/json')) {
        const data = await initResponse.json()
        if (data.result) {
          serverInfo = {
            name: data.result.serverInfo?.name || 'Unknown',
            version: data.result.serverInfo?.version || 'Unknown',
            protocolVersion: data.result.protocolVersion,
          }
        }
      } else if (contentType?.includes('text/event-stream')) {
        // SSE transport detected
        sessionId = initResponse.headers.get('x-session-id') || undefined
      }

      // Request tools list
      const toolsRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: ++this.messageId,
      }

      const toolsResponse = await fetch(config.url, {
        method: 'POST',
        headers: {
          ...headers,
          ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
        },
        body: JSON.stringify(toolsRequest),
      })

      let tools: any[] = []
      let resources: any[] = []

      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json()
        if (toolsData.result?.tools) {
          tools = toolsData.result.tools
        }
      }

      // Try to get resources
      try {
        const resourcesRequest = {
          jsonrpc: '2.0',
          method: 'resources/list',
          params: {},
          id: ++this.messageId,
        }

        const resourcesResponse = await fetch(config.url, {
          method: 'POST',
          headers: {
            ...headers,
            ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          },
          body: JSON.stringify(resourcesRequest),
        })

        if (resourcesResponse.ok) {
          const resourcesData = await resourcesResponse.json()
          if (resourcesData.result?.resources) {
            resources = resourcesData.result.resources
          }
        }
      } catch (err) {
        log.debug({ err }, 'Resources might not be supported')
      }

      const latency = Date.now() - startTime

      // Credential validation via tools/call
      let credentialsValid: boolean | undefined
      let credentialsError: string | undefined
      let validationTool: string | undefined

      const selectedTool = selectValidationTool(tools)
      if (selectedTool) {
        validationTool = selectedTool.name
        try {
          const callRequest = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: selectedTool.name,
              arguments: {},
            },
            id: ++this.messageId,
          }

          const callResponse = await fetch(config.url, {
            method: 'POST',
            headers: {
              ...headers,
              ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
            },
            body: JSON.stringify(callRequest),
          })

          if (callResponse.ok) {
            const callData = await callResponse.json()
            const classification = classifyCredentialResponse(callData)
            credentialsValid = classification.valid
            credentialsError = classification.error
          }
        } catch (err) {
          log.debug({ err }, 'Credential validation failed to execute, leave as undefined')
        }
      }

      return {
        connected: true,
        transport: contentType?.includes('text/event-stream') ? 'sse' : 'http',
        latencyMs: latency,
        serverInfo,
        toolsCount: tools.length,
        tools: tools.slice(0, 50),
        resourcesCount: resources.length,
        resources: resources.slice(0, 20),
        credentialsValid,
        credentialsError,
        validationTool,
      }
    } catch (error) {
      return {
        connected: false,
        transport: 'http',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Test stdio-based MCP server
   */
  static async testStdioServer(
    serverConfig: MCPServerConfig,
    extraEnv?: Record<string, string>,
  ): Promise<MCPTestResult> {
    const startTime = Date.now()

    return new Promise((resolve) => {
      const command = serverConfig.command || 'npx'
      const args = serverConfig.args || []
      const env = { ...process.env, ...serverConfig.env, ...extraEnv }

      // Set a timeout for the test. Cold-starting an `npx -y` MCP server can
      // routinely take 20–40s (npm install + node boot + tools/list). The SDK
      // path in chat manages its own lifecycle, but this test endpoint kills
      // the child if it doesn't finish in time, so be generous.
      const isProxyServer = args.some((arg) => arg.includes('mcp-remote'))
      const testTimeout = isProxyServer ? 45000 : 30000
      const timeout = setTimeout(() => {
        resolve({
          connected: false,
          error: `Connection timeout (${testTimeout / 1000} seconds)`,
          toolsCount: 0,
          tools: [],
        })
      }, testTimeout)

      try {
        // Spawn the MCP server process
        const child = spawn(command, args, {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        let output = ''
        let errorOutput = ''
        let messagesAreSent = false

        const initMessage =
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'mcp-direct-tester',
                version: '1.0.0',
              },
            },
            id: 1,
          }) + '\n'

        const listToolsMessage =
          JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            params: {},
            id: 2,
          }) + '\n'

        let validationToolSent = false
        let validationToolName: string | undefined

        const sendMessages = () => {
          if (messagesAreSent) return
          messagesAreSent = true
          child.stdin?.write(initMessage)
          setTimeout(() => {
            child.stdin?.write(listToolsMessage)
          }, 500)
        }

        // Collect output
        child.stdout?.on('data', (data) => {
          output += data.toString()
        })

        child.stderr?.on('data', (data) => {
          const chunk = data.toString()
          errorOutput += chunk
          // For proxy servers (mcp-remote), wait until proxy is established before sending messages
          if (isProxyServer && chunk.includes('Proxy established')) {
            sendMessages()
          }
        })

        // For non-proxy servers, send messages immediately
        if (!isProxyServer) {
          sendMessages()
        } else {
          // Fallback: if proxy doesn't signal readiness within 8s, try sending anyway
          setTimeout(() => sendMessages(), 8000)
        }

        // Wait for tools/list response, then send validation tool call.
        // Cold `npx -y` installs (e.g. supabase MCP) need 20–30s before the
        // server even starts responding; 2s was way too short.
        const toolsListDelay = isProxyServer ? 15000 : 22000
        setTimeout(() => {
          // Parse tools from output so far
          const tools: any[] = []
          const resources: any[] = []

          try {
            const lines = output.split('\n')
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const response = JSON.parse(line)
                  if (response.result?.tools) {
                    tools.push(...response.result.tools)
                  }
                  if (response.result?.resources) {
                    resources.push(...response.result.resources)
                  }
                } catch (err) {
                  log.debug({ err }, 'Ignore non-JSON lines')
                }
              }
            }
          } catch (err) {
            log.debug({ err }, 'Ignore parse errors')
          }

          // Send validation tool call if we found tools
          const selectedTool = selectValidationTool(tools)
          if (selectedTool && tools.length > 0) {
            validationToolName = selectedTool.name
            validationToolSent = true
            const callMessage =
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                  name: selectedTool.name,
                  arguments: {},
                },
                id: 3,
              }) + '\n'
            child.stdin?.write(callMessage)
          }

          // Wait for validation response then resolve
          const validationDelay = validationToolSent ? 2000 : 0
          setTimeout(() => {
            clearTimeout(timeout)
            child.kill()

            const latency = Date.now() - startTime

            // Re-parse all output including validation response
            const allTools: any[] = []
            const allResources: any[] = []
            let credentialsValid: boolean | undefined
            let credentialsError: string | undefined

            try {
              const lines = output.split('\n')
              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const response = JSON.parse(line)
                    if (response.result?.tools) {
                      allTools.push(...response.result.tools)
                    }
                    if (response.result?.resources) {
                      allResources.push(...response.result.resources)
                    }
                    // Parse validation response (id: 3)
                    if (response.id === 3 && validationToolSent) {
                      const classification = classifyCredentialResponse(response)
                      credentialsValid = classification.valid
                      credentialsError = classification.error
                    }
                  } catch (err) {
                    log.debug({ err }, 'Ignore non-JSON lines')
                  }
                }
              }

              if (allTools.length > 0 || output.includes('initialize')) {
                resolve({
                  connected: true,
                  transport: 'stdio',
                  latencyMs: latency,
                  toolsCount: allTools.length,
                  tools: allTools.slice(0, 50),
                  resourcesCount: allResources.length,
                  resources: allResources.slice(0, 20),
                  credentialsValid,
                  credentialsError,
                  validationTool: validationToolName,
                })
              } else if (errorOutput) {
                resolve({
                  connected: false,
                  transport: 'stdio',
                  error: this.cleanErrorMessage(errorOutput),
                  toolsCount: 0,
                  tools: [],
                })
              } else {
                resolve({
                  connected: false,
                  transport: 'stdio',
                  error: 'No response from server',
                  toolsCount: 0,
                  tools: [],
                })
              }
            } catch (error) {
              resolve({
                connected: false,
                transport: 'stdio',
                error: error instanceof Error ? error.message : 'Unknown error',
                toolsCount: 0,
                tools: [],
              })
            }
          }, validationDelay)
        }, toolsListDelay)

        child.on('error', (error) => {
          clearTimeout(timeout)
          resolve({
            connected: false,
            transport: 'stdio',
            error: error.message,
            toolsCount: 0,
            tools: [],
          })
        })
      } catch (error) {
        clearTimeout(timeout)
        resolve({
          connected: false,
          transport: 'stdio',
          error: error instanceof Error ? error.message : 'Unknown error',
          toolsCount: 0,
          tools: [],
        })
      }
    })
  }

  /**
   * Test PostgreSQL MCP server specifically
   */
  static async testPostgresDirect(): Promise<MCPTestResult> {
    const postgresConfig: MCPServerConfig = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', process.env.DATABASE_URL || ''],
    }

    return this.testMCPServerDirect(postgresConfig)
  }

  /**
   * Test with custom timeout
   */
  static async testWithTimeout(
    serverConfig: MCPServerConfig,
    timeoutMs: number = 10000,
  ): Promise<MCPTestResult> {
    return Promise.race([
      this.testMCPServerDirect(serverConfig),
      new Promise<MCPTestResult>((resolve) =>
        setTimeout(
          () =>
            resolve({
              connected: false,
              error: `Connection timeout (${timeoutMs / 1000} seconds)`,
              toolsCount: 0,
              tools: [],
            }),
          timeoutMs,
        ),
      ),
    ])
  }

  private static cleanErrorMessage(error: string): string {
    if (error.includes('npm install')) {
      return 'MCP server package not installed. It will be installed on first use.'
    }
    if (error.includes('ENOENT')) {
      return 'MCP server command not found'
    }
    // Limit error message length
    return error.substring(0, 500)
  }
}
