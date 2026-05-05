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
  slack: env('MAX_TURNS_SLACK', 40),

  /** Discord integration */
  discord: env('MAX_TURNS_DISCORD', 40),

  /** Agent-to-agent chat tool (delegate_task child sessions) */
  agentChat: env('MAX_TURNS_AGENT_CHAT', 25),

  /** Direct agent execution (workspace-agent-executor.ts) */
  executor: env('MAX_TURNS_EXECUTOR', 100),
}
