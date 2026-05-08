/**
 * Workspace MCP Proxy
 *
 * Wraps each external workspace MCP (Sanity, Linear, Supabase, etc. — anything
 * configured via `.mcp.config.json`) in an in-process `createSdkMcpServer`
 * shell. Tools registered through `createSdkMcpServer` participate in the Agent
 * SDK's deferred-tool index, which is what `ToolSearch` searches against —
 * external stdio MCPs handed to the SDK directly do not.
 *
 * Each proxy spawns the underlying MCP via the appropriate `Client` transport
 * (stdio, SSE, or streamable HTTP), calls `listTools()` to discover the live
 * schema, then registers every tool on the in-process server with a handler
 * that forwards the call through the MCP `Client`. From the SDK's perspective
 * the tools are local; the user experience is `ToolSearch {"query":"sanity"}`
 * returning matches.
 *
 * Hardening:
 *   - bounded connect, listTools, and per-call timeouts
 *   - thrown errors map to `CallToolResult { isError: true }`
 *   - transport.onclose marks proxy broken; next call triggers one reconnect
 *   - reconnect attempts are deduplicated via a shared promise
 *   - reconnect attempts capped (MAX_RECONNECT_ATTEMPTS); after cap the proxy is
 *     permanently broken and every call fails fast with a structured error
 *   - executor abort signal cancels in-flight calls and short-circuits new ones
 *   - notifications/tools/list_changed re-registers the tool list mid-session
 *   - stdio, SSE, and streamable-HTTP transports supported
 */

import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { createLogger } from '@utils/logger'

const log = createLogger('workspace-mcp-proxy')

const CONNECT_TIMEOUT_MS = 30_000
const LIST_TOOLS_TIMEOUT_MS = 30_000
const CALL_TOOL_TIMEOUT_MS = 120_000
const MAX_RECONNECT_ATTEMPTS = 3

type ExternalServerConfig = {
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  transport?: string
  type?: string
}

type ProxyState = {
  serverName: string
  cfg: ExternalServerConfig
  baseEnv: Record<string, string>
  abortSignal: AbortSignal | undefined
  client: Client
  transport: Transport
  sdkServer: McpSdkServerConfigWithInstance
  registeredTools: Set<string>
  isBroken: boolean
  permanentlyBroken: boolean
  reconnectAttempts: number
  reconnecting: Promise<void> | null
  closed: boolean
}

export type WorkspaceMcpProxyOptions = {
  abortSignal?: AbortSignal
}

export type WorkspaceMcpProxyResult = {
  servers: Record<string, McpSdkServerConfigWithInstance>
  close: () => Promise<void>
}

const withTimeout = async <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([p, guard])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const errorResult = (
  serverName: string,
  toolName: string,
  err: unknown,
): { content: Array<{ type: 'text'; text: string }>; isError: true } => {
  const msg = err instanceof Error ? err.message : String(err)
  return {
    content: [{ type: 'text' as const, text: `${serverName}.${toolName} failed: ${msg}` }],
    isError: true,
  }
}

const transportKind = (cfg: ExternalServerConfig): 'stdio' | 'sse' | 'http' | 'unknown' => {
  const explicit = (cfg.transport ?? cfg.type ?? '').toLowerCase()
  if (explicit === 'sse') return 'sse'
  if (explicit === 'http' || explicit === 'streamable-http') return 'http'
  if (explicit === 'stdio') return 'stdio'
  if (cfg.command) return 'stdio'
  if (cfg.url) return 'http'
  return 'unknown'
}

const buildTransport = (cfg: ExternalServerConfig, baseEnv: Record<string, string>): Transport => {
  const kind = transportKind(cfg)
  if (kind === 'stdio') {
    return new StdioClientTransport({
      command: cfg.command!,
      args: cfg.args ?? [],
      env: { ...baseEnv, ...(cfg.env ?? {}) },
    })
  }
  if (kind === 'sse') {
    if (!cfg.url) throw new Error('SSE transport requires a `url` field')
    return new SSEClientTransport(new URL(cfg.url))
  }
  if (kind === 'http') {
    if (!cfg.url) throw new Error('HTTP transport requires a `url` field')
    return new StreamableHTTPClientTransport(new URL(cfg.url))
  }
  throw new Error(`Unsupported MCP transport for proxy (transport=${cfg.transport ?? 'unset'})`)
}

const connectFreshClient = async (
  cfg: ExternalServerConfig,
  baseEnv: Record<string, string>,
): Promise<{ client: Client; transport: Transport }> => {
  const transport = buildTransport(cfg, baseEnv)
  const client = new Client({ name: 'lazarus-mcp-proxy', version: '1.0.0' }, { capabilities: {} })
  await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, 'MCP client connect')
  return { client, transport }
}

const listToolsBounded = async (client: Client, serverName: string) => {
  return withTimeout(client.listTools(), LIST_TOOLS_TIMEOUT_MS, `${serverName} listTools`)
}

const reconcileTools = async (state: ProxyState): Promise<void> => {
  const list = await listToolsBounded(state.client, state.serverName)
  const seen = new Set<string>()
  const inst: any = state.sdkServer.instance
  for (const t of list.tools) {
    seen.add(t.name)
    const inputSchema = (t.inputSchema as Record<string, unknown> | undefined) ?? {
      type: 'object',
      properties: {},
    }
    if (state.registeredTools.has(t.name)) {
      const existing = inst._registeredTools?.[t.name]
      if (existing && typeof existing.update === 'function') {
        try {
          existing.update({
            description: t.description ?? '',
            inputSchema: inputSchema as any,
          })
        } catch (err) {
          log.debug({ err }, `tool update failed: ${state.serverName}.${t.name}`)
        }
      }
      continue
    }
    state.sdkServer.instance.registerTool(
      t.name,
      {
        description: t.description ?? '',
        inputSchema: inputSchema as any,
      },
      (async (args: Record<string, unknown>) => {
        return (await callViaProxy(state, t.name, args)) as any
      }) as any,
    )
    state.registeredTools.add(t.name)
  }
  for (const existingName of Array.from(state.registeredTools)) {
    if (seen.has(existingName)) continue
    const reg = inst._registeredTools?.[existingName]
    if (reg && typeof reg.disable === 'function') {
      try {
        reg.disable()
      } catch (err) {
        log.debug({ err }, `tool disable failed: ${state.serverName}.${existingName}`)
      }
    }
    state.registeredTools.delete(existingName)
  }
}

const bindCloseListener = (state: ProxyState): void => {
  state.transport.onclose = () => {
    if (state.closed) return
    state.isBroken = true
    log.warn(`MCP transport closed mid-run: ${state.serverName} — will reconnect on next call`)
  }
}

const bindToolListChangedListener = (state: ProxyState): void => {
  try {
    state.client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      if (state.closed || state.permanentlyBroken) return
      log.info(`tools/list_changed received: ${state.serverName} — reconciling tool list`)
      try {
        await reconcileTools(state)
      } catch (err) {
        log.error({ err }, `tool list reconcile failed: ${state.serverName}`)
      }
    })
  } catch (err) {
    log.debug({ err }, `notification handler bind failed: ${state.serverName}`)
  }
}

const ensureReconnected = async (state: ProxyState): Promise<void> => {
  if (!state.isBroken || state.closed || state.permanentlyBroken) return
  if (state.reconnecting) return state.reconnecting
  state.reconnecting = (async () => {
    try {
      try {
        await state.transport.close()
      } catch {
        /* ignore — transport already broken */
      }
      const fresh = await connectFreshClient(state.cfg, state.baseEnv)
      state.client = fresh.client
      state.transport = fresh.transport
      bindCloseListener(state)
      bindToolListChangedListener(state)
      // Refresh schemas in case server changed them across reconnect
      await reconcileTools(state)
      state.isBroken = false
      state.reconnectAttempts = 0
      log.info(`MCP proxy reconnected: ${state.serverName}`)
    } catch (err) {
      state.reconnectAttempts += 1
      log.error(
        { err, attempt: state.reconnectAttempts, max: MAX_RECONNECT_ATTEMPTS },
        `MCP proxy reconnect failed: ${state.serverName}`,
      )
      if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        state.permanentlyBroken = true
        log.error(
          `MCP proxy giving up: ${state.serverName} — ${MAX_RECONNECT_ATTEMPTS} reconnect attempts failed, all subsequent calls will fast-fail`,
        )
      }
    } finally {
      state.reconnecting = null
    }
  })()
  return state.reconnecting
}

const callViaProxy = async (
  state: ProxyState,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> => {
  // Check abort first — when an executor abort fires, it triggers close() via
  // our listener; we still want callers to see the abort cause, not a generic
  // closed error.
  if (state.abortSignal?.aborted) {
    return errorResult(state.serverName, toolName, new Error('Execution aborted'))
  }
  if (state.closed) {
    return errorResult(state.serverName, toolName, new Error('MCP proxy already closed'))
  }
  if (state.permanentlyBroken) {
    return errorResult(
      state.serverName,
      toolName,
      new Error('MCP transport unavailable (permanently broken after reconnect cap)'),
    )
  }
  if (state.isBroken) {
    await ensureReconnected(state)
    if (state.permanentlyBroken) {
      return errorResult(
        state.serverName,
        toolName,
        new Error('MCP transport unavailable (permanently broken after reconnect cap)'),
      )
    }
    if (state.isBroken) {
      return errorResult(
        state.serverName,
        toolName,
        new Error('MCP transport unavailable (reconnect failed)'),
      )
    }
  }
  try {
    const result = await state.client.callTool({ name: toolName, arguments: args }, undefined, {
      timeout: CALL_TOOL_TIMEOUT_MS,
      signal: state.abortSignal,
    })
    return result
  } catch (err) {
    log.error({ err }, `MCP tool call failed: ${state.serverName}.${toolName}`)
    return errorResult(state.serverName, toolName, err)
  }
}

const buildOneProxy = async (
  serverName: string,
  cfg: ExternalServerConfig,
  baseEnv: Record<string, string>,
  abortSignal: AbortSignal | undefined,
): Promise<ProxyState> => {
  const fresh = await connectFreshClient(cfg, baseEnv)
  const sdkServer = createSdkMcpServer({ name: serverName, version: '1.0.0', tools: [] })
  const state: ProxyState = {
    serverName,
    cfg,
    baseEnv,
    abortSignal,
    client: fresh.client,
    transport: fresh.transport,
    sdkServer,
    registeredTools: new Set(),
    isBroken: false,
    permanentlyBroken: false,
    reconnectAttempts: 0,
    reconnecting: null,
    closed: false,
  }
  bindCloseListener(state)
  bindToolListChangedListener(state)
  await reconcileTools(state)
  log.info(`MCP proxy ready: ${serverName} (${state.registeredTools.size} tools)`)
  return state
}

const closeProxy = async (state: ProxyState): Promise<void> => {
  state.closed = true
  try {
    await state.client.close()
  } catch (e) {
    log.debug({ err: e }, `proxy client close failed: ${state.serverName}`)
  }
  try {
    await state.transport.close()
  } catch (e) {
    log.debug({ err: e }, `proxy transport close failed: ${state.serverName}`)
  }
}

export const createWorkspaceMcpProxies = async (
  externalConfigs: Record<string, ExternalServerConfig>,
  baseEnv: Record<string, string>,
  options: WorkspaceMcpProxyOptions = {},
): Promise<WorkspaceMcpProxyResult> => {
  const entries = Object.entries(externalConfigs).filter(([name, cfg]) => {
    const kind = transportKind(cfg)
    if (kind === 'unknown') {
      log.warn(
        `Skipping ${name}: no recognised transport (no command/url, transport=${cfg.transport})`,
      )
      return false
    }
    return true
  })
  const settled = await Promise.allSettled(
    entries.map(([name, cfg]) => buildOneProxy(name, cfg, baseEnv, options.abortSignal)),
  )

  const proxied: ProxyState[] = []
  const servers: Record<string, McpSdkServerConfigWithInstance> = {}
  settled.forEach((r, i) => {
    const entry = entries[i]
    if (!entry) return
    const [name] = entry
    if (r.status === 'fulfilled') {
      proxied.push(r.value)
      servers[name] = r.value.sdkServer
    } else {
      log.error({ err: r.reason }, `MCP proxy failed: ${name} (will be unavailable to agent)`)
    }
  })

  const close = async (): Promise<void> => {
    await Promise.allSettled(proxied.map(closeProxy))
  }

  // Tear everything down on abort so in-flight callTool requests reject and
  // child processes are reaped — covers the gap between SDK abort and the
  // executor's orphan-process cleanup.
  if (options.abortSignal) {
    const onAbort = (): void => {
      log.warn('Execution aborted — closing all workspace MCP proxies')
      void close()
    }
    if (options.abortSignal.aborted) onAbort()
    else options.abortSignal.addEventListener('abort', onAbort, { once: true })
  }

  return { servers, close }
}
