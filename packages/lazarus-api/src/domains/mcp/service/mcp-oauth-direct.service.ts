import * as crypto from 'crypto'
import { execSync } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@utils/logger'
const log = createLogger('mcp-oauth-direct')

/**
 * MCP OAuth Direct Service
 *
 * Handles the full OAuth 2.1 + PKCE authorization flow server-side for any MCP
 * server that supports it (Notion, Atlassian, Sentry, etc.).
 *
 * Why this exists:
 *   The standard `mcp-remote` npm package starts a localhost callback server on
 *   the machine running it. On our EC2 backend that means the OAuth provider
 *   redirects to EC2's localhost — unreachable from the user's browser.
 *   This service replaces that localhost flow with our own public callback URL
 *   so the redirect works correctly.
 *
 * Token compatibility:
 *   Tokens are written in the exact format and directory structure that
 *   `mcp-remote` expects, so subsequent agent executions (which still use
 *   `mcp-remote` under the hood) find valid tokens without re-authenticating.
 *
 * Flow overview:
 *   1. Discover OAuth endpoints via .well-known metadata
 *   2. Register client via Dynamic Client Registration (RFC 7591)
 *   3. Build authorization URL with PKCE challenge
 *   4. User authorizes in browser -> provider redirects to our callback
 *   5. Callback exchanges code for tokens (see mcp.ts route)
 *   6. Tokens stored in mcp-remote compatible format on disk
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Public callback URL that OAuth providers redirect to after authorization. */
const CALLBACK_URL = (() => {
  if (process.env.MCP_OAUTH_CALLBACK_URL) return process.env.MCP_OAUTH_CALLBACK_URL
  const base = process.env.WORKSPACE_DOMAIN_URL ?? 'http://localhost:8000'
  return `${base.replace(/\/$/, '')}/api/mcp/oauth/callback`
})()

/** How long a pending OAuth state lives before automatic cleanup. */
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ─── Types ───────────────────────────────────────────────────────────────────

/** State stored in memory between initiating OAuth and receiving the callback. */
interface PendingOAuthState {
  codeVerifier: string
  clientId: string
  clientSecret?: string
  tokenEndpoint: string
  workspacePath: string
  serverName: string
  serverUrl: string
  createdAt: number
}

// ─── In-memory state store ───────────────────────────────────────────────────

const pendingStates = new Map<string, PendingOAuthState>()

// Periodically evict expired states to prevent memory leaks.
setInterval(
  () => {
    const now = Date.now()
    for (const [key, state] of pendingStates) {
      if (now - state.createdAt > STATE_TTL_MS) {
        pendingStates.delete(key)
      }
    }
  },
  5 * 60 * 1000,
)

// ─── Crypto helpers ──────────────────────────────────────────────────────────

/**
 * Generate a PKCE code verifier (random string) and its S256 challenge.
 * Used to prove that the token exchange request came from the same party
 * that initiated the authorization request.
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

/**
 * MD5 hash of a URL string. Used as a filename-safe identifier for per-server
 * token/client files, matching mcp-remote's internal hashing convention.
 */
function urlHash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

/**
 * Compute the localhost port mcp-remote would use for a given server URL hash.
 * Mirrors mcp-remote's `calculateDefaultPort()` so our stored client_info.json
 * contains the correct localhost redirect_uri that mcp-remote expects.
 */
function calculateDefaultPort(hash: string): number {
  const offset = parseInt(hash.substring(0, 4), 16)
  return 3335 + (offset % 45816)
}

// ─── mcp-remote compatibility ────────────────────────────────────────────────

/**
 * Resolve the versioned subdirectory name where mcp-remote stores its files.
 *
 * mcp-remote organizes tokens at:
 *   {configDir}/mcp-remote-{version}/{hash}_tokens.json
 *
 * We detect the version by:
 *   1. Looking for existing mcp-remote-* directories (picks the latest)
 *   2. Resolving the installed mcp-remote package version via require.resolve
 *   3. Falling back to a known stable version
 */
async function getMcpRemoteVersionDir(authDir: string): Promise<string> {
  // 1. Check for existing directories
  try {
    const entries = await fs.readdir(authDir)
    const mcpDirs = entries.filter((e) => e.startsWith('mcp-remote-'))
    if (mcpDirs.length > 0) {
      mcpDirs.sort()
      return mcpDirs[mcpDirs.length - 1]!
    }
  } catch (err) {
    log.debug({ err }, 'Directory might not exist yet')
  }

  // 2. Try to resolve version from installed package
  try {
    const pkgPath = execSync('node -e "log.info(require.resolve(\'mcp-remote/package.json\'))"', {
      timeout: 5000,
      encoding: 'utf-8',
    }).trim()
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))
    if (pkg.version) {
      return `mcp-remote-${pkg.version}`
    }
  } catch (err) {
    log.debug({ err }, 'Package not installed or not resolvable')
  }

  // 3. Fallback to known version
  return 'mcp-remote-0.1.37'
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

/**
 * Wrapper around fetch() that aborts after a timeout.
 * Used for all outbound HTTP calls to OAuth endpoints so we don't hang
 * indefinitely if a provider is unresponsive.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── OAuth discovery ─────────────────────────────────────────────────────────

/**
 * Discover the OAuth authorization server endpoints for an MCP server.
 *
 * Follows the MCP OAuth 2.1 discovery spec:
 *   1. Fetch Protected Resource Metadata from
 *      {origin}/.well-known/oauth-protected-resource
 *      to find which authorization server protects this resource.
 *   2. Fetch Authorization Server Metadata from
 *      {authServer}/.well-known/oauth-authorization-server
 *      to get the authorization, token, and registration endpoints.
 *
 * Works with any OAuth-enabled MCP server (Notion, Atlassian, Sentry, etc.).
 */
async function discoverOAuthMetadata(serverUrl: string): Promise<{
  authorizationEndpoint: string
  tokenEndpoint: string
  registrationEndpoint?: string
}> {
  const origin = new URL(serverUrl).origin

  // Step 1: Try Protected Resource Metadata to find the auth server
  let authServerUrl = origin
  try {
    const prmRes = await fetchWithTimeout(`${origin}/.well-known/oauth-protected-resource`)
    if (prmRes.ok) {
      const prm = (await prmRes.json()) as any
      if (prm.authorization_servers?.length > 0) {
        authServerUrl = prm.authorization_servers[0]
      }
    }
  } catch (err) {
    log.debug({ err }, 'PRM not available — fall through to use origin directly')
  }

  // Step 2: Fetch Authorization Server Metadata
  const asUrl = `${authServerUrl}/.well-known/oauth-authorization-server`
  const asRes = await fetchWithTimeout(asUrl)
  if (!asRes.ok) {
    throw new Error(`Failed to discover OAuth metadata from ${asUrl}: ${asRes.status}`)
  }

  const meta = (await asRes.json()) as any
  if (!meta.authorization_endpoint || !meta.token_endpoint) {
    throw new Error('OAuth metadata missing required endpoints')
  }

  return {
    authorizationEndpoint: meta.authorization_endpoint,
    tokenEndpoint: meta.token_endpoint,
    registrationEndpoint: meta.registration_endpoint,
  }
}

// ─── Dynamic Client Registration ────────────────────────────────────────────

/**
 * Register a new OAuth client via Dynamic Client Registration (RFC 7591).
 *
 * Important: We register with ONLY our public callback URL. Some providers
 * (e.g. Notion) reject or strip extra redirect URIs. By registering a single
 * URI we guarantee it matches during both the authorization request and the
 * token exchange, avoiding "Invalid redirect URI" errors.
 *
 * The localhost URI needed by mcp-remote is added only to the stored
 * client_info.json file (not registered with the provider).
 */
async function registerClient(
  registrationEndpoint: string,
): Promise<{ clientId: string; clientSecret?: string }> {
  const res = await fetchWithTimeout(registrationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Lazarus AI Platform',
      redirect_uris: [CALLBACK_URL],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: '',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Dynamic client registration failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as any
  if (!data.client_id) {
    throw new Error('Client registration response missing client_id')
  }

  return {
    clientId: data.client_id,
    clientSecret: data.client_secret,
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Credentials from a user-registered OAuth client (bypasses DCR). */
export interface PreRegisteredOAuthClient {
  clientId: string
  clientSecret?: string
}

/**
 * Initiate a server-side OAuth flow for any MCP server.
 *
 * Steps:
 *   1. Discover OAuth endpoints from the server's .well-known metadata
 *   2. Load or create a client registration (cached in client_info.json)
 *   3. Generate PKCE verifier + challenge
 *   4. Store pending state in memory (keyed by a random `state` param)
 *   5. Return the authorization URL for the user's browser
 *
 * The returned URL points the user to the provider's consent screen.
 * After they approve, the provider redirects to our callback (GET /api/mcp/oauth/callback)
 * which calls `exchangeCodeForTokens()` to complete the flow.
 *
 * @param workspacePath       - Absolute path to the workspace directory on disk
 * @param serverName          - MCP server name in workspace config (e.g. "notion")
 * @param serverUrl           - Remote MCP server URL (e.g. "https://mcp.notion.com/mcp")
 * @param preRegisteredClient - If provided, skip DCR and use these credentials
 *                              (the user has registered their own OAuth client
 *                              with the provider and pre-approved our callback URL).
 */
export async function initiateDirectOAuth(
  workspacePath: string,
  serverName: string,
  serverUrl: string,
  preRegisteredClient?: PreRegisteredOAuthClient,
): Promise<{ authorizationUrl: string }> {
  // 1. Discover OAuth endpoints
  const metadata = await discoverOAuthMetadata(serverUrl)

  // 2. Resolve or create client registration
  const authDir = path.join(workspacePath, '.mcp-auth')
  const versionDir = await getMcpRemoteVersionDir(authDir)
  const versionedDir = path.join(authDir, versionDir)
  const hash = urlHash(serverUrl)
  const clientInfoPath = path.join(versionedDir, `${hash}_client_info.json`)

  let clientId!: string
  let clientSecret: string | undefined
  let needsRegistration = true

  // If the caller provided credentials from a user-registered OAuth client,
  // use them directly and persist them so mcp-remote can reuse them at agent-run
  // time. DCR is skipped entirely in this path.
  if (preRegisteredClient) {
    clientId = preRegisteredClient.clientId
    clientSecret = preRegisteredClient.clientSecret
    needsRegistration = false

    const localhostPort = calculateDefaultPort(hash)
    const localhostCallbackUrl = `http://localhost:${localhostPort}/oauth/callback`

    await fs.mkdir(versionedDir, { recursive: true })
    await fs.writeFile(
      clientInfoPath,
      JSON.stringify(
        {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uris: [CALLBACK_URL, localhostCallbackUrl],
          client_name: 'Lazarus AI Platform',
          token_endpoint_auth_method: clientSecret ? 'client_secret_post' : 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
        },
        null,
        2,
      ),
    )

    for (const suffix of ['_code_verifier.txt', '_lock.json']) {
      await fs.unlink(path.join(versionedDir, `${hash}${suffix}`)).catch(() => {})
    }
  }

  // Try to reuse a cached client — but only if it was registered with our callback URL.
  // Clients registered by mcp-remote (localhost only) can't be reused because the
  // redirect_uri won't match during our token exchange.
  if (needsRegistration) {
    try {
      const cached = JSON.parse(await fs.readFile(clientInfoPath, 'utf-8'))
      const uris: string[] = cached.redirect_uris || []
      if (cached.client_id && uris.includes(CALLBACK_URL)) {
        clientId = cached.client_id
        clientSecret = cached.client_secret
        needsRegistration = false
      }
    } catch (err) {
      log.debug({ err }, 'No cached registration or file unreadable')
    }
  }

  if (needsRegistration) {
    if (!metadata.registrationEndpoint) {
      throw new Error(
        'OAuth server does not support dynamic client registration and no compatible client is cached',
      )
    }

    const registration = await registerClient(metadata.registrationEndpoint)
    clientId = registration.clientId
    clientSecret = registration.clientSecret

    // Compute the localhost callback URL that mcp-remote would use.
    // We include it in the stored file so mcp-remote can determine its callback port,
    // even though this URI is NOT registered with the OAuth provider.
    const localhostPort = calculateDefaultPort(hash)
    const localhostCallbackUrl = `http://localhost:${localhostPort}/oauth/callback`

    // Write client_info.json in mcp-remote compatible format
    await fs.mkdir(versionedDir, { recursive: true })
    await fs.writeFile(
      clientInfoPath,
      JSON.stringify(
        {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uris: [CALLBACK_URL, localhostCallbackUrl],
          client_name: 'Lazarus AI Platform',
          token_endpoint_auth_method: 'none',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
        },
        null,
        2,
      ),
    )

    // Remove stale files left by previous mcp-remote flows
    for (const suffix of ['_code_verifier.txt', '_lock.json']) {
      await fs.unlink(path.join(versionedDir, `${hash}${suffix}`)).catch(() => {})
    }
  }

  // 3. Generate PKCE pair
  const { codeVerifier, codeChallenge } = generatePKCE()

  // 4. Generate random state param (links callback back to this request)
  const state = crypto.randomBytes(16).toString('hex')

  // 5. Store everything needed for the callback in memory
  pendingStates.set(state, {
    codeVerifier,
    clientId,
    clientSecret,
    tokenEndpoint: metadata.tokenEndpoint,
    workspacePath,
    serverName,
    serverUrl,
    createdAt: Date.now(),
  })

  // 6. Build the authorization URL
  const authUrl = new URL(metadata.authorizationEndpoint)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', CALLBACK_URL)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return { authorizationUrl: authUrl.toString() }
}

/**
 * Look up a pending OAuth state by the `state` query parameter.
 * Called by the callback route to retrieve the PKCE verifier and token endpoint.
 */
export function getPendingState(state: string): PendingOAuthState | undefined {
  return pendingStates.get(state)
}

/**
 * Remove a pending state after it has been consumed (success or error).
 */
export function removePendingState(state: string): void {
  pendingStates.delete(state)
}

/**
 * Exchange an authorization code for access/refresh tokens and persist them.
 *
 * Called by the OAuth callback route after the user authorizes.
 * Sends the code + PKCE verifier to the provider's token endpoint,
 * then writes the tokens to disk in mcp-remote's expected format so
 * agent executions can reuse them seamlessly.
 *
 * Token file path:
 *   {workspacePath}/.mcp-auth/mcp-remote-{version}/{md5(serverUrl)}_tokens.json
 */
export async function exchangeCodeForTokens(
  pendingState: PendingOAuthState,
  code: string,
): Promise<void> {
  // Build the token exchange request
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CALLBACK_URL,
    client_id: pendingState.clientId,
    code_verifier: pendingState.codeVerifier,
  })

  if (pendingState.clientSecret) {
    body.set('client_secret', pendingState.clientSecret)
  }

  const res = await fetchWithTimeout(pendingState.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${errBody}`)
  }

  const tokens = (await res.json()) as any
  if (!tokens.access_token) {
    throw new Error('Token response missing access_token')
  }

  // Write tokens in mcp-remote compatible format
  const authDir = path.join(pendingState.workspacePath, '.mcp-auth')
  const versionDir = await getMcpRemoteVersionDir(authDir)
  const versionedDir = path.join(authDir, versionDir)
  const hash = urlHash(pendingState.serverUrl)
  const tokensPath = path.join(versionedDir, `${hash}_tokens.json`)

  await fs.mkdir(versionedDir, { recursive: true })
  await fs.writeFile(
    tokensPath,
    JSON.stringify(
      {
        access_token: tokens.access_token,
        token_type: tokens.token_type || 'Bearer',
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        obtained_at: Math.floor(Date.now() / 1000),
      },
      null,
      2,
    ),
  )
}
