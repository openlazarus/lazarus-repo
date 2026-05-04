/**
 * Shared Discord Tool Helpers
 *
 * Utilities shared between integration-channel-tools.ts and discord-management-tools.ts.
 * Extracted to avoid circular dependencies and code duplication.
 */

import { discordService } from '@domains/discord/service/discord.service'
import { getExecutionContext } from '@domains/execution/service/execution-context'

// ---------------------------------------------------------------------------
// MCP tool result helpers
// ---------------------------------------------------------------------------

/** Build the standard MCP tool result envelope from a plain object. */
export function toolResult(data: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

/** Shortcut for returning an error result. */
export function toolError(error: string) {
  return toolResult({ success: false, error })
}

// ---------------------------------------------------------------------------
// Discord client singleton (shared with discord-bot.ts)
// ---------------------------------------------------------------------------

let discordClient: any = null

/**
 * Set the Discord client from the bot.
 * Called by discord-bot.ts on startup.
 */
export function setDiscordClient(client: any) {
  discordClient = client
}

/**
 * Get the Discord client singleton.
 */
export function getDiscordClient() {
  return discordClient
}

// ---------------------------------------------------------------------------
// Discord message chunking
// ---------------------------------------------------------------------------

/**
 * Split content at newline boundaries to fit within Discord's 2000-char limit.
 */
export function chunkDiscordMessage(content: string, maxLength = 2000): string[] {
  if (content.length <= maxLength) return [content]

  const chunks: string[] = []
  let remaining = content

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt <= 0) {
      splitAt = maxLength
    }

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).replace(/^\n/, '')
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Workspace guild scoping
// ---------------------------------------------------------------------------

/**
 * Get the set of Discord guild IDs that are connected to the current workspace.
 * Uses the DiscordService repository instead of direct Supabase calls.
 * Returns null if workspace context is unavailable.
 */
export async function getAllowedDiscordGuildIds(): Promise<{
  workspaceId: string
  guildIds: Set<string>
} | null> {
  const workspaceId = getExecutionContext().workspaceId
  if (!workspaceId) return null

  const connections = await discordService.getConnectionsByWorkspace(workspaceId)
  const enabledGuildIds = connections.filter((c) => c.enabled).map((c) => c.guildId)

  return {
    workspaceId,
    guildIds: new Set(enabledGuildIds),
  }
}
