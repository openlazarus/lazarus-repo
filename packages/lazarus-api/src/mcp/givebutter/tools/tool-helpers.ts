import { createWriteStream, promises as fsp, WriteStream } from 'fs'
import * as path from 'path'
import { z } from 'zod'
import { TToolResult } from '@mcp/givebutter/types/tool.types'
import { TPaginated } from '@mcp/givebutter/types/givebutter.types'
import {
  GivebutterAuthError,
  GivebutterError,
  GivebutterForbiddenError,
  GivebutterNetworkError,
  GivebutterNotFoundError,
  GivebutterRateLimitError,
  GivebutterServerError,
  GivebutterValidationError,
} from '@mcp/givebutter/types/givebutter.errors'
import { TFieldList, projectItem, projectList } from './response-projection'

type TErrorFormatter = (err: GivebutterError) => string

type TErrorEntry = { ctor: new (...args: never[]) => GivebutterError; format: TErrorFormatter }

const ERROR_ENTRIES: TErrorEntry[] = [
  {
    ctor: GivebutterAuthError,
    format: () =>
      'Givebutter rejected the API key. Check that GIVEBUTTER_API_KEY is set and valid.',
  },
  {
    ctor: GivebutterForbiddenError,
    format: () => 'Givebutter denied access. The API key may lack required permissions.',
  },
  { ctor: GivebutterNotFoundError, format: (e) => `Givebutter resource not found: ${e.message}` },
  { ctor: GivebutterValidationError, format: (e) => `Givebutter validation failed: ${e.message}` },
  {
    ctor: GivebutterRateLimitError,
    format: (e) => `Givebutter rate limit hit: ${e.message}. Retry later.`,
  },
  {
    ctor: GivebutterServerError,
    format: (e) => `Givebutter server error (status ${e.statusCode}): ${e.message}`,
  },
  {
    ctor: GivebutterNetworkError,
    format: (e) => `Network error contacting Givebutter: ${e.message}`,
  },
]

const toText = (text: string): TToolResult => ({ content: [{ type: 'text', text }] })
const toError = (text: string): TToolResult => ({
  content: [{ type: 'text', text }],
  isError: true,
})

export const toToolResult = <T>(data: T): TToolResult => toText(JSON.stringify(data, null, 2))

const findFormatter = (err: GivebutterError): TErrorFormatter => {
  const entry = ERROR_ENTRIES.find((e) => err instanceof e.ctor)
  return entry ? entry.format : (e) => `Givebutter error: ${e.message}`
}

export const formatGivebutterError = (err: unknown): TToolResult => {
  if (err instanceof GivebutterError) return toError(findFormatter(err)(err))
  if (err instanceof Error) return toError(`Unexpected error: ${err.message}`)
  return toError('Unexpected non-error value thrown')
}

export const wrapToolHandler = <TInput>(
  fn: (input: TInput) => Promise<unknown>,
): ((input: unknown) => Promise<TToolResult>) => {
  return async (input: unknown): Promise<TToolResult> => {
    try {
      return toToolResult(await fn(input as TInput))
    } catch (err) {
      return formatGivebutterError(err)
    }
  }
}

export type TLeanListOptions = {
  fields?: string[]
  summary?: boolean
}

const selectBase = (lean: TFieldList, summary?: TFieldList, useSummary?: boolean): TFieldList =>
  useSummary && summary ? summary : lean

export const wrapLeanListHandler = <TInput extends TLeanListOptions, TItem extends object>(
  leanFields: TFieldList,
  fn: (input: TInput) => Promise<TPaginated<TItem>>,
  summaryFields?: TFieldList,
): ((input: unknown) => Promise<TToolResult>) => {
  return async (input: unknown): Promise<TToolResult> => {
    try {
      const typed = (input ?? {}) as TInput
      const res = await fn(typed)
      const base = selectBase(leanFields, summaryFields, typed.summary)
      return toToolResult(projectList(res, base, typed.fields))
    } catch (err) {
      return formatGivebutterError(err)
    }
  }
}

export type TLeanItemOptions = { fields?: string[] }

export const wrapLeanItemHandler = <TInput extends TLeanItemOptions, TItem extends object>(
  leanFields: TFieldList,
  fn: (input: TInput) => Promise<TItem>,
): ((input: unknown) => Promise<TToolResult>) => {
  return async (input: unknown): Promise<TToolResult> => {
    try {
      const typed = (input ?? {}) as TInput
      const res = await fn(typed)
      return toToolResult(projectItem(res, leanFields, typed.fields))
    } catch (err) {
      return formatGivebutterError(err)
    }
  }
}

const BULK_PER_PAGE = 100
const BULK_DEFAULT_MAX_PAGES = 500
const BULK_INLINE_HARD_CAP_PAGES = 1000
const BULK_SPOOL_HARD_CAP_PAGES = 10000
const BULK_INLINE_ROW_LIMIT = 500
const BULK_INLINE_CHAR_LIMIT = 200_000

export type TBulkListOptions = TLeanListOptions & {
  max_pages?: number
  output_path?: string
}

export const bulkListShape = {
  max_pages: z
    .number()
    .int()
    .positive()
    .max(BULK_SPOOL_HARD_CAP_PAGES)
    .optional()
    .describe(
      `Safety cap on pages fetched. Default 500; hard-capped at 1000 when returning inline, 10000 when spooling to file. Each page = ${BULK_PER_PAGE} rows.`,
    ),
  output_path: z
    .string()
    .optional()
    .describe(
      'If set, rows are streamed as NDJSON (one JSON per line) to this path. Must resolve within this workspace (absolute paths must be under the workspace dir; relative paths are resolved against it). When set, response is a summary only — row data is not returned inline. Recommended for datasets above a few thousand rows.',
    ),
}

type TBulkCollectResult<T> = {
  rows: T[]
  total: number
  pagesFetched: number
  truncated: boolean
}

type TSpoolResult = {
  output_path: string
  total: number
  pages_fetched: number
  rows_written: number
  truncated: boolean
}

const clampMaxPages = (n: number | undefined, cap: number): number => {
  if (!n || n < 1) return Math.min(BULK_DEFAULT_MAX_PAGES, cap)
  return Math.min(n, cap)
}

const assertUnderInlineLimit = (total: number): void => {
  if (total <= BULK_INLINE_ROW_LIMIT) return
  throw new GivebutterValidationError(
    `Dataset has ${total} rows — exceeds inline row limit of ${BULK_INLINE_ROW_LIMIT}. Retry the same call with output_path set (e.g. "data/<resource>.ndjson", relative to workspace) to spool results as NDJSON instead of returning them inline.`,
  )
}

const assertUnderInlineCharLimit = (json: string): void => {
  if (json.length <= BULK_INLINE_CHAR_LIMIT) return
  throw new GivebutterValidationError(
    `Inline result is ${json.length} characters, exceeds ${BULK_INLINE_CHAR_LIMIT}. Retry the same call with output_path set (e.g. "data/<resource>.ndjson", relative to workspace) to spool results as NDJSON.`,
  )
}

const collectAllPages = async <TInput extends object, TItem>(
  input: TInput,
  fetchPage: (p: TInput & { page: number; per_page: number }) => Promise<TPaginated<TItem>>,
  maxPages: number,
  enforceInlineLimit: boolean,
): Promise<TBulkCollectResult<TItem>> => {
  const rows: TItem[] = []
  let page = 1
  let lastPage = 1
  let total = 0
  while (page <= lastPage && page <= maxPages) {
    const res = await fetchPage({ ...input, page, per_page: BULK_PER_PAGE })
    if (enforceInlineLimit && page === 1) assertUnderInlineLimit(res.meta.total)
    rows.push(...res.data)
    total = res.meta.total
    lastPage = res.meta.last_page
    page++
  }
  return { rows, total, pagesFetched: page - 1, truncated: lastPage > maxPages }
}

const buildBulkResult = <T extends object>(
  collected: TBulkCollectResult<T>,
  base: TFieldList,
  extra?: string[],
): { data: Partial<T>[]; total: number; pages_fetched: number; truncated: boolean } => ({
  data: collected.rows.map((row) => projectItem(row, base, extra)),
  total: collected.total,
  pages_fetched: collected.pagesFetched,
  truncated: collected.truncated,
})

const getWorkspaceRoot = (): string => {
  const workspacePath = process.env.WORKSPACE_PATH
  if (!workspacePath) {
    throw new GivebutterValidationError(
      'output_path is unavailable: WORKSPACE_PATH env is not set for this MCP subprocess. Re-save the workspace MCP config to enable file spooling.',
    )
  }
  return path.resolve(workspacePath)
}

const assertSafeOutputPath = (outputPath: string): string => {
  const root = getWorkspaceRoot()
  const resolved = path.isAbsolute(outputPath)
    ? path.resolve(outputPath)
    : path.resolve(root, outputPath)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new GivebutterValidationError(
      `output_path must resolve within workspace ${root} (got "${resolved}")`,
    )
  }
  return resolved
}

const openSpoolStream = async (
  outputPath: string,
): Promise<{ stream: WriteStream; safePath: string }> => {
  const safePath = assertSafeOutputPath(outputPath)
  await fsp.mkdir(path.dirname(safePath), { recursive: true })
  return { stream: createWriteStream(safePath, { flags: 'w' }), safePath }
}

const writeProjectedRows = <TItem extends object>(
  stream: WriteStream,
  rows: TItem[],
  base: TFieldList,
  extra: string[] | undefined,
): number => {
  for (const row of rows) {
    stream.write(JSON.stringify(projectItem(row, base, extra)) + '\n')
  }
  return rows.length
}

const closeStream = (stream: WriteStream): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.end((err?: Error | null) => (err ? reject(err) : resolve()))
  })

const spoolAllPages = async <TInput extends object, TItem extends object>(
  input: TInput,
  fetchPage: (p: TInput & { page: number; per_page: number }) => Promise<TPaginated<TItem>>,
  outputPath: string,
  base: TFieldList,
  extra: string[] | undefined,
  maxPages: number,
): Promise<TSpoolResult> => {
  const { stream, safePath } = await openSpoolStream(outputPath)
  let page = 1
  let lastPage = 1
  let total = 0
  let rowsWritten = 0
  try {
    while (page <= lastPage && page <= maxPages) {
      const res = await fetchPage({ ...input, page, per_page: BULK_PER_PAGE })
      rowsWritten += writeProjectedRows(stream, res.data, base, extra)
      total = res.meta.total
      lastPage = res.meta.last_page
      page++
    }
  } finally {
    await closeStream(stream)
  }
  return {
    output_path: safePath,
    total,
    pages_fetched: page - 1,
    rows_written: rowsWritten,
    truncated: lastPage > maxPages,
  }
}

const runBulkInline = async <TInput extends TBulkListOptions, TItem extends object>(
  typed: TInput,
  fetchPage: (input: TInput & { page: number; per_page: number }) => Promise<TPaginated<TItem>>,
  base: TFieldList,
): Promise<TToolResult> => {
  const maxPages = clampMaxPages(typed.max_pages, BULK_INLINE_HARD_CAP_PAGES)
  const collected = await collectAllPages(typed, fetchPage, maxPages, true)
  const json = JSON.stringify(buildBulkResult(collected, base, typed.fields), null, 2)
  assertUnderInlineCharLimit(json)
  return { content: [{ type: 'text', text: json }] }
}

const runBulkSpool = async <TInput extends TBulkListOptions, TItem extends object>(
  typed: TInput,
  fetchPage: (input: TInput & { page: number; per_page: number }) => Promise<TPaginated<TItem>>,
  base: TFieldList,
): Promise<TToolResult> => {
  const maxPages = clampMaxPages(typed.max_pages, BULK_SPOOL_HARD_CAP_PAGES)
  const result = await spoolAllPages(
    typed,
    fetchPage,
    typed.output_path as string,
    base,
    typed.fields,
    maxPages,
  )
  return toToolResult(result)
}

export const wrapBulkListHandler = <TInput extends TBulkListOptions, TItem extends object>(
  leanFields: TFieldList,
  fetchPage: (input: TInput & { page: number; per_page: number }) => Promise<TPaginated<TItem>>,
  summaryFields?: TFieldList,
): ((input: unknown) => Promise<TToolResult>) => {
  return async (input: unknown): Promise<TToolResult> => {
    try {
      const typed = (input ?? {}) as TInput
      const base = selectBase(leanFields, summaryFields, typed.summary)
      if (typed.output_path) return await runBulkSpool(typed, fetchPage, base)
      return await runBulkInline(typed, fetchPage, base)
    } catch (err) {
      return formatGivebutterError(err)
    }
  }
}
