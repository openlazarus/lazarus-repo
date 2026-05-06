import { z } from 'zod'
import { createLogger } from '@utils/logger'
import type { TOrToolDef } from './types'

const log = createLogger('openrouter-tool-registry')

export interface TRegisteredTool {
  exposedName: string
  description: string
  jsonSchema: Record<string, unknown>
  invoke: (input: Record<string, unknown>) => Promise<string>
}

type TSdkTool = {
  name: string
  description: string
  inputSchema: Record<string, z.ZodTypeAny>
  handler: (args: Record<string, unknown>, extra: unknown) => Promise<unknown>
}

function toJsonSchema(shape: Record<string, z.ZodTypeAny>): Record<string, unknown> {
  try {
    const obj = z.object(shape)
    const schema = z.toJSONSchema(obj) as Record<string, unknown>
    delete schema.$schema
    return schema
  } catch (err) {
    log.warn({ err }, 'failed to convert zod schema; falling back to empty object')
    return { type: 'object', properties: {}, additionalProperties: true }
  }
}

function flattenToolResult(result: unknown): string {
  if (result == null) return ''
  if (typeof result === 'string') return result
  const r = result as { content?: Array<{ type: string; text?: string }>; isError?: boolean }
  if (Array.isArray(r.content)) {
    const parts = r.content
      .map((c) => (c.type === 'text' && typeof c.text === 'string' ? c.text : JSON.stringify(c)))
      .join('\n')
    return parts
  }
  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

export class ToolRegistry {
  private readonly tools = new Map<string, TRegisteredTool>()

  registerSdkTools(serverName: string, tools: TSdkTool[]): void {
    for (const t of tools) {
      const exposed = `mcp__${serverName}__${t.name}`
      this.tools.set(exposed, {
        exposedName: exposed,
        description: t.description,
        jsonSchema: toJsonSchema(t.inputSchema),
        invoke: async (input) => flattenToolResult(await t.handler(input, {})),
      })
    }
  }

  registerMcpTool(
    serverName: string,
    tool: { name: string; description?: string; inputSchema?: Record<string, unknown> },
    invoke: (input: Record<string, unknown>) => Promise<unknown>,
  ): void {
    const exposed = `mcp__${serverName}__${tool.name}`
    this.tools.set(exposed, {
      exposedName: exposed,
      description: tool.description ?? '',
      jsonSchema: tool.inputSchema ?? { type: 'object', properties: {} },
      invoke: async (input) => flattenToolResult(await invoke(input)),
    })
  }

  filter(disallowed: string[] | undefined): ToolRegistry {
    if (!disallowed?.length) return this
    const out = new ToolRegistry()
    for (const [name, t] of this.tools) {
      if (!disallowed.includes(name)) out.tools.set(name, t)
    }
    return out
  }

  get(name: string): TRegisteredTool | undefined {
    return this.tools.get(name)
  }

  names(): string[] {
    return [...this.tools.keys()]
  }

  toOpenAiTools(): TOrToolDef[] {
    return [...this.tools.values()].map((t) => ({
      type: 'function',
      function: {
        name: t.exposedName,
        description: t.description,
        parameters: t.jsonSchema,
      },
    }))
  }
}
