/**
 * Filter parent process env before passing it to the Agent SDK subprocess.
 *
 * The SDK spawns a subprocess that hosts spawned MCP servers (Notion, Linear,
 * GitHub, etc.) and reaches Anthropic's API. It needs PATH, HOME, NODE_*,
 * ANTHROPIC_API_KEY, and Lazarus-specific vars consumed by in-process tools.
 *
 * It does NOT need server-only secrets (database creds, Stripe keys, JWT
 * secrets, AWS keys). Those are exclusively used by the parent Express
 * process and propagating them widens blast radius if a tool is ever
 * compromised.
 *
 * Strategy: denylist. Keep everything else. Adding a new MCP that needs a
 * specific env var doesn't require touching this file.
 */

const SECRETS_DENYLIST: readonly string[] = [
  'DATABASE_URL',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
]

const DENY = new Set(SECRETS_DENYLIST)

/**
 * Return a copy of `env` with server-only secrets removed.
 * Drops `undefined` values so the result is a clean `Record<string, string>`.
 */
export function filterServerSecrets(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(env)) {
    if (DENY.has(key)) continue
    const value = env[key]
    if (typeof value === 'string') out[key] = value
  }
  return out
}
