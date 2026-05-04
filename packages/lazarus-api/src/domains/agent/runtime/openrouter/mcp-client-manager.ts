import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { createLogger } from '@utils/logger'
import type { ToolRegistry } from './tool-registry'

const log = createLogger('openrouter-mcp-client-manager')

interface TStdioConfig {
  type?: 'stdio'
  command: string
  args?: string[]
  env?: Record<string, string>
}

export interface TMcpServerStatus {
  name: string
  status: 'connected' | 'failed' | 'disabled'
  error?: string
}

export class McpClientManager {
  private readonly clients: Array<{ name: string; client: Client }> = []

  async start(
    servers: Record<string, unknown> | undefined,
    registry: ToolRegistry,
  ): Promise<TMcpServerStatus[]> {
    const statuses: TMcpServerStatus[] = []
    if (!servers) return statuses

    for (const [name, rawConfig] of Object.entries(servers)) {
      const config = rawConfig as { type?: string } | undefined
      if (!config) continue

      if (config.type && config.type !== 'stdio') {
        log.warn(
          { name, type: config.type },
          'non-stdio MCP transport not supported in v1; skipping',
        )
        statuses.push({ name, status: 'disabled', error: `transport ${config.type} not supported` })
        continue
      }

      try {
        await this.startStdio(name, config as TStdioConfig, registry)
        statuses.push({ name, status: 'connected' })
      } catch (err) {
        log.error({ err, name }, 'failed to connect MCP server')
        statuses.push({ name, status: 'failed', error: (err as Error).message })
      }
    }
    return statuses
  }

  private async startStdio(
    name: string,
    config: TStdioConfig,
    registry: ToolRegistry,
  ): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
    })
    const client = new Client({ name: 'lazarus-openrouter', version: '1.0.0' })
    await client.connect(transport)

    const list = await client.listTools({})
    for (const tool of list.tools ?? []) {
      registry.registerMcpTool(
        name,
        {
          name: tool.name,
          description: tool.description ?? '',
          inputSchema: tool.inputSchema as Record<string, unknown>,
        },
        async (input) => {
          const result = await client.callTool({ name: tool.name, arguments: input })
          return result
        },
      )
    }
    this.clients.push({ name, client })
    log.info({ name, tools: list.tools?.length ?? 0 }, 'MCP server connected')
  }

  async shutdown(): Promise<void> {
    await Promise.allSettled(
      this.clients.map(async ({ name, client }) => {
        try {
          await client.close()
        } catch (err) {
          log.warn({ err, name }, 'error closing MCP client')
        }
      }),
    )
    this.clients.length = 0
  }
}
