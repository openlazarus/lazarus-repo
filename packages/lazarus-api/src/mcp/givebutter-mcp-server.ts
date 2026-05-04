#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import pino from 'pino'
import { GivebutterHttpClient } from '@mcp/givebutter/infrastructure/givebutter-http-client'
import { GivebutterService } from '@mcp/givebutter/givebutter.service'
import { buildGivebutterTools } from '@mcp/givebutter/tool-registry'
import { TToolRegistry } from '@mcp/givebutter/types/tool.types'

const DEFAULT_BASE_URL = 'https://api.givebutter.com'

const log = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    formatters: { level: (label) => ({ level: label }) },
    base: {
      service: 'lazarus-api',
      module: 'givebutter-mcp',
      env: process.env.NODE_ENV || 'development',
    },
  },
  pino.destination(2),
)

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    process.stderr.write(`${name} is required for givebutter-mcp-server\n`)
    process.exit(1)
  }
  return value
}

const registerTool = (server: McpServer, registry: TToolRegistry, name: string): void => {
  const def = registry[name]!
  server.tool(def.name, def.description, def.schema, (args: unknown) => def.handler(args))
}

const registerAllTools = (server: McpServer, registry: TToolRegistry): void => {
  for (const name of Object.keys(registry)) registerTool(server, registry, name)
}

const main = async (): Promise<void> => {
  const apiKey = requireEnv('GIVEBUTTER_API_KEY')
  const baseUrl = process.env.GIVEBUTTER_BASE_URL || DEFAULT_BASE_URL

  const http = new GivebutterHttpClient({ apiKey, baseUrl })
  const service = new GivebutterService(http)
  const registry = buildGivebutterTools(service)

  const server = new McpServer({ name: 'givebutter', version: '1.0.0' })
  registerAllTools(server, registry)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  log.info({ tools: Object.keys(registry).length, baseUrl }, 'givebutter-mcp-server started')
}

main().catch((err: unknown) => {
  log.error({ err }, 'givebutter-mcp-server failed to start')
  process.exit(1)
})
