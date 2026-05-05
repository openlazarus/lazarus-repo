/**
 * Per-tool size limits for the PostToolUse truncation hook.
 *
 * `'skip'`        — never truncate (built-ins that self-cap, or tools whose
 *                   responses are reliably small by design).
 * `{ softLimitChars, keepPrefixChars }` — truncate when the response exceeds
 *                   `softLimitChars`; keep the first `keepPrefixChars`.
 *
 * Tools not listed fall back to `DEFAULT_LIMIT`. Numbers are character counts
 * (≈4 chars/token for English text).
 */

export type ToolLimit = 'skip' | { softLimitChars: number; keepPrefixChars: number }

export const DEFAULT_LIMIT: { softLimitChars: number; keepPrefixChars: number } = {
  softLimitChars: 32_000,
  keepPrefixChars: 8_000,
}

const PER_TOOL: Record<string, ToolLimit> = {
  Read: 'skip',
  Grep: 'skip',
  Bash: 'skip',
  Glob: 'skip',
  LS: 'skip',
  Edit: 'skip',
  Write: 'skip',
  MultiEdit: 'skip',
  NotebookEdit: 'skip',
  WebSearch: 'skip',
  WebFetch: 'skip',

  'mcp__memory-tools__memory_search': 'skip',
  'mcp__memory-tools__memory_read': 'skip',
  'mcp__memory-tools__memory_save': 'skip',
  'mcp__memory-tools__memory_update': 'skip',
  'mcp__memory-tools__memory_list_tags': 'skip',

  // Read-shaped tools: the agent was explicitly asked to read this content.
  // Truncating the tail can drop load-bearing context (e.g. the user's actual
  // question buried at the end of a long thread). Cost protection here belongs
  // upstream — prompt the agent to filter at query time, not after the fact.
  'mcp__email-tools__email_read': 'skip',
  'mcp__email-tools__email_conversation_history': 'skip',
  'mcp__whatsapp-tools__whatsapp_read': 'skip',
  'mcp__whatsapp-tools__whatsapp_conversation_history': 'skip',
  'mcp__integration-channel-tools__fetch_discord_channel_history': 'skip',
  'mcp__integration-channel-tools__fetch_slack_channel_history': 'skip',
  'mcp__integration-channel-tools__get_slack_thread_replies': 'skip',
  mcp__linear__linear_get_issue: 'skip',
  mcp__linear__linear_get_project: 'skip',
  'mcp__notion__notion-fetch': 'skip',
}

export function getToolLimit(toolName: string): ToolLimit {
  return PER_TOOL[toolName] ?? DEFAULT_LIMIT
}
