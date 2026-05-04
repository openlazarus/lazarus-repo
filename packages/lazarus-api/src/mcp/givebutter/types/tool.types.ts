import { ZodRawShape } from 'zod'

export type TToolTextContent = { type: 'text'; text: string }

export type TToolResult = {
  content: TToolTextContent[]
  isError?: boolean
}

export type TToolDefinition<TInput = unknown> = {
  name: string
  description: string
  schema: ZodRawShape
  handler: (input: TInput) => Promise<TToolResult>
}

export type TToolRegistry = Record<string, TToolDefinition>
