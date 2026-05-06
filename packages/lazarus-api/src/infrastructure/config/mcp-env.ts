/**
 * MCP Environment Helpers — Shared utilities for building MCP server env blocks.
 *
 * Injects memory caps (NODE_OPTIONS) and session tracking tags into
 * the environment passed to MCP child processes.
 */

import { EXECUTION_LIMITS } from '@infrastructure/config/execution-limits'

function mergeNodeOptions(existing: string | undefined, extra: string): string {
  return [existing, extra].filter(Boolean).join(' ')
}

function memoryCapFlag(): string {
  return `--max-old-space-size=${EXECUTION_LIMITS.mcpMaxOldSpaceMb}`
}

/** Build env with memory cap for MCP child processes. */
export function withMemoryCap(env: Record<string, string> = {}): Record<string, string> {
  return {
    ...env,
    NODE_OPTIONS: mergeNodeOptions(env.NODE_OPTIONS, memoryCapFlag()),
  }
}

/** Build env with memory cap and chat session tag. */
export function withChatSessionTag(
  env: Record<string, string>,
  sessionTag: string,
): Record<string, string> {
  return {
    ...withMemoryCap(env),
    LAZARUS_CHAT_SESSION_ID: sessionTag,
  }
}

/** Build env with memory cap and execution ID (for agent executor). */
export function withExecutionTag(
  env: Record<string, string>,
  executionId: string,
): Record<string, string> {
  return {
    ...withMemoryCap(env),
    LAZARUS_EXECUTION_ID: executionId,
  }
}
