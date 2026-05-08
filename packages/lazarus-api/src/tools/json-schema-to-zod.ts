import { z } from 'zod'

/**
 * Minimal JSON Schema → Zod converter, scoped to what MCP servers emit in
 * `tools/list` `inputSchema` fields. The Anthropic Agent SDK's in-process MCP
 * server validates tool arguments via `inputSchema.safeParseAsync(args)` — so
 * a Zod schema is required even when the upstream tool definition arrives as
 * JSON Schema (e.g. for proxied workspace MCPs).
 *
 * Coverage focuses on what real MCPs use: object/string/number/integer/boolean
 * with enums, arrays, anyOf/oneOf unions, and required-property tracking.
 * Anything we don't recognize falls back to `z.unknown()` / `z.any()` so the
 * tool stays callable; upstream MCP performs the real validation.
 */

type TJsonSchema = Record<string, unknown> | undefined

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const jsonSchemaToZod = (schema: TJsonSchema): z.ZodTypeAny => {
  if (!schema || !isRecord(schema)) return z.unknown()

  if (Array.isArray(schema.anyOf)) return buildUnion(schema.anyOf)
  if (Array.isArray(schema.oneOf)) return buildUnion(schema.oneOf)

  const t = schema.type
  if (Array.isArray(t)) return buildUnion(t.map((tt) => ({ ...schema, type: tt })))

  if (t === 'string') return buildString(schema)
  if (t === 'integer' || t === 'number') return buildNumber(schema, t === 'integer')
  if (t === 'boolean') return z.boolean()
  if (t === 'null') return z.null()
  if (t === 'array') return buildArray(schema)
  if (t === 'object' || t === undefined) return buildObject(schema)

  return z.unknown()
}

const buildUnion = (variants: unknown[]): z.ZodTypeAny => {
  const zods = variants.filter(isRecord).map((v) => jsonSchemaToZod(v))
  if (zods.length === 0) return z.unknown()
  if (zods.length === 1) return zods[0]!
  return z.union(zods as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
}

const buildString = (schema: Record<string, unknown>): z.ZodTypeAny => {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const literals: z.ZodTypeAny[] = schema.enum.map((v) => z.literal(v as never))
    if (literals.length === 1) return literals[0]!
    return z.union(literals as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]])
  }
  return z.string()
}

const buildNumber = (schema: Record<string, unknown>, integer: boolean): z.ZodTypeAny => {
  let n: z.ZodNumber = z.number()
  if (integer) n = n.int()
  if (typeof schema.minimum === 'number') n = n.min(schema.minimum)
  if (typeof schema.maximum === 'number') n = n.max(schema.maximum)
  return n
}

const buildArray = (schema: Record<string, unknown>): z.ZodTypeAny => {
  const items = schema.items
  const itemSchema = isRecord(items) ? jsonSchemaToZod(items) : z.unknown()
  return z.array(itemSchema)
}

const buildObject = (schema: Record<string, unknown>): z.ZodTypeAny => {
  const properties = isRecord(schema.properties) ? schema.properties : undefined
  const required = Array.isArray(schema.required) ? new Set(schema.required as string[]) : new Set()

  if (!properties) {
    return schema.additionalProperties === false
      ? z.object({}).strict()
      : z.record(z.string(), z.unknown())
  }

  const shape: Record<string, z.ZodTypeAny> = {}
  for (const [key, value] of Object.entries(properties)) {
    const child = jsonSchemaToZod(isRecord(value) ? value : undefined)
    shape[key] = required.has(key) ? child : child.optional()
  }
  return schema.additionalProperties === false ? z.object(shape).strict() : z.object(shape)
}

/**
 * Return a Zod *raw shape* (Record<string, ZodType>) when the schema describes
 * an object — the MCP SDK accepts a raw shape as `inputSchema` and wraps it
 * with `objectFromShape`. Falls back to a single-schema wrapper (`{ value: zod }`)
 * for non-object schemas, which keeps MCP tools/list serialization sane.
 */
export const jsonSchemaToZodShape = (schema: TJsonSchema): Record<string, z.ZodTypeAny> => {
  if (!schema || !isRecord(schema)) return {}

  if (schema.type === 'object' || schema.type === undefined) {
    const properties = isRecord(schema.properties) ? schema.properties : {}
    const required = Array.isArray(schema.required)
      ? new Set(schema.required as string[])
      : new Set()
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const [key, value] of Object.entries(properties)) {
      const child = jsonSchemaToZod(isRecord(value) ? value : undefined)
      shape[key] = required.has(key) ? child : child.optional()
    }
    return shape
  }

  return { value: jsonSchemaToZod(schema) }
}
