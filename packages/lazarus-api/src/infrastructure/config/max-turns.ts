function env(key: string, fallback: number): number {
  const v = process.env[key]
  if (!v) return fallback
  const n = parseInt(v, 10)
  return isNaN(n) ? fallback : n
}

export const MAX_TURNS = {
  /** Scheduled/webhook triggers (trigger-manager.ts) */
  triggers: env('MAX_TURNS_TRIGGERS', 100),

  /** Chat API route (chat.ts) */
  chat: env('MAX_TURNS_CHAT', 100),

  /** Slack integration */
  slack: env('MAX_TURNS_SLACK', 100),

  /** Discord integration */
  discord: env('MAX_TURNS_DISCORD', 100),

  /** Agent-to-agent chat tool */
  agentChat: env('MAX_TURNS_AGENT_CHAT', 100),

  /** Direct agent execution (workspace-agent-executor.ts) */
  executor: env('MAX_TURNS_EXECUTOR', 100),
}
