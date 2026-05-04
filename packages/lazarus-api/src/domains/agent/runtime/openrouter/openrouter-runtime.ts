import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk'
import { createLogger } from '@utils/logger'
import type { IAgentRuntime } from '../agent-runtime.interface'
import type { TAgentRunRequest, TAgentRuntimeMessage } from '../agent-runtime.types'
import { runAgentLoop } from './agent-loop'
import { HookRunner, type THookMatcher } from './hook-runner'
import { McpClientManager } from './mcp-client-manager'
import { OpenRouterClient } from './openrouter-client'
import { ToolRegistry } from './tool-registry'

const log = createLogger('openrouter-runtime')

interface TRegisteredToolInternal {
  description?: string
  inputSchema?: unknown
  handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>
  enabled?: boolean
}

function registerSdkServerTools(
  registry: ToolRegistry,
  serverName: string,
  instance: unknown,
): void {
  // The SDK's McpServer keeps tools in a private `_registeredTools` map.
  // Introspect it to expose tools through OpenRouter's OpenAI-style tool_calls.
  const internal = (instance as { _registeredTools?: Record<string, TRegisteredToolInternal> })
    ._registeredTools
  if (!internal) return
  const tools: Array<{
    name: string
    description: string
    inputSchema: Record<string, import('zod').ZodTypeAny>
    handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>
  }> = []
  for (const [name, reg] of Object.entries(internal)) {
    if (reg.enabled === false) continue
    const raw = reg.inputSchema as { shape?: Record<string, unknown> } | undefined
    const shape = (raw && 'shape' in raw ? raw.shape : raw) as
      | Record<string, import('zod').ZodTypeAny>
      | undefined
    tools.push({
      name,
      description: reg.description ?? '',
      inputSchema: shape ?? {},
      handler: reg.handler as never,
    })
  }
  registry.registerSdkTools(serverName, tools)
}

function buildRegistry(
  mcpServers: Record<string, unknown> | undefined,
  disallowed: string[] | undefined,
): { registry: ToolRegistry; stdioServers: Record<string, unknown> } {
  const registry = new ToolRegistry()
  const stdioServers: Record<string, unknown> = {}
  if (mcpServers) {
    for (const [name, cfg] of Object.entries(mcpServers)) {
      const c = cfg as { type?: string; instance?: unknown; command?: string } | undefined
      if (!c) continue
      if (c.type === 'sdk' && c.instance) {
        registerSdkServerTools(registry, name, c.instance)
      } else if (c.command) {
        stdioServers[name] = c
      } else {
        log.warn({ name, type: c.type }, 'unsupported MCP server config; skipping')
      }
    }
  }
  const filtered = disallowed?.length ? registry.filter(disallowed) : registry
  return { registry: filtered, stdioServers }
}

export class OpenrouterRuntime implements IAgentRuntime {
  run(request: TAgentRunRequest): AsyncIterable<TAgentRuntimeMessage> {
    return runInternal(request)
  }
}

async function* runInternal(request: TAgentRunRequest): AsyncGenerator<SDKMessage, void, void> {
  const client = OpenRouterClient.fromEnv()
  if (!client) {
    throw new Error('OPENROUTER_API_KEY not set; cannot run openrouter runtime')
  }

  const opts = request.options
  const { registry, stdioServers } = buildRegistry(
    opts.mcpServers as Record<string, unknown> | undefined,
    opts.disallowedTools,
  )
  const mcpManager = new McpClientManager()
  const mcpStatuses = await mcpManager.start(stdioServers, registry)

  const hookMatchers = (opts.hooks?.PreToolUse ?? []) as unknown as THookMatcher[]
  const hookRunner = new HookRunner(hookMatchers)

  try {
    yield* runAgentLoop(request, { client, registry, hookRunner, mcpManager, mcpStatuses })
  } finally {
    try {
      await mcpManager.shutdown()
    } catch (err) {
      log.warn({ err }, 'MCP shutdown error')
    }
  }
}
