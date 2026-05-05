/**
 * PostToolUse hook that truncates oversized tool_responses before they enter
 * the prompt prefix. Without this, large paginated MCP responses (GitHub
 * list_commits, Notion list_pages, Supabase queries, etc.) bloat the
 * cached prefix and inflate cache_creation/cache_read on every subsequent turn.
 *
 * Per-tool thresholds and the skip list live in
 * `@infrastructure/config/tool-result-limits`.
 */

import { getToolLimit, type ToolLimit } from '@infrastructure/config/tool-result-limits'

const buildTruncationNote = (
  originalLen: number,
  omittedLen: number,
  keepPrefixChars: number,
): string =>
  `\n\n[lazarus-truncate] Tool response truncated. Original was ${originalLen.toLocaleString()} chars (~${Math.round(originalLen / 4).toLocaleString()} tokens); kept first ${keepPrefixChars.toLocaleString()} chars; ${omittedLen.toLocaleString()} chars omitted. Re-fetch with a tighter filter (page, limit, since/until, perPage, fields, range, etc.) to get a smaller slice instead of paginating exhaustively. The omitted content is gone — do NOT pretend you read it.`

function truncateString(s: string, softLimitChars: number, keepPrefixChars: number): string {
  if (s.length <= softLimitChars) return s
  const prefix = s.slice(0, keepPrefixChars)
  const omitted = s.length - prefix.length
  return prefix + buildTruncationNote(s.length, omitted, keepPrefixChars)
}

function truncateValue(v: unknown, softLimitChars: number, keepPrefixChars: number): unknown {
  if (typeof v === 'string') return truncateString(v, softLimitChars, keepPrefixChars)
  if (Array.isArray(v)) return v.map((x) => truncateValue(x, softLimitChars, keepPrefixChars))
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = truncateValue(val, softLimitChars, keepPrefixChars)
    }
    return out
  }
  return v
}

function responseTotalSize(response: unknown): number {
  try {
    return typeof response === 'string' ? response.length : JSON.stringify(response).length
  } catch {
    return 0
  }
}

export function createTruncateToolResultsHook(log?: { info: (obj: unknown, msg: string) => void }) {
  return async (input: { tool_name: string; tool_response: unknown }) => {
    const toolName = input.tool_name
    const limit: ToolLimit = getToolLimit(toolName)

    if (limit === 'skip') {
      return { continue: true }
    }

    const totalSize = responseTotalSize(input.tool_response)
    if (totalSize <= limit.softLimitChars) {
      return { continue: true }
    }

    const truncated = truncateValue(
      input.tool_response,
      limit.softLimitChars,
      limit.keepPrefixChars,
    )
    const newSize = responseTotalSize(truncated)

    if (log) {
      log.info(
        { toolName, originalSize: totalSize, truncatedSize: newSize },
        'lazarus-truncate: tool response truncated',
      )
    }

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        updatedMCPToolOutput: truncated,
      },
    }
  }
}
