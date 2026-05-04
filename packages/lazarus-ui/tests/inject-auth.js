/**
 * Generates the agent-browser cookie command to inject authentication
 *
 * Usage: eval "$(node tests/inject-auth.js)"
 */

const fs = require('fs')
const path = require('path')

const AUTH_STATE_FILE = path.join(__dirname, '.auth-state.json')

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF
const APP_DOMAIN = process.env.APP_DOMAIN ?? 'localhost'

if (!SUPABASE_PROJECT_REF) {
  console.error('SUPABASE_PROJECT_REF env var is required')
  process.exit(1)
}

if (!fs.existsSync(AUTH_STATE_FILE)) {
  console.error('Auth state not found. Run: node tests/setup-auth.js')
  process.exit(1)
}

const auth = JSON.parse(fs.readFileSync(AUTH_STATE_FILE, 'utf-8'))

// Generate the cookie value (JSON stringified)
const cookieValue = JSON.stringify({
  access_token: auth.session.access_token,
  refresh_token: auth.session.refresh_token,
  expires_at: auth.session.expires_at,
  token_type: 'bearer',
  user: {
    id: auth.user.id,
    email: auth.user.email,
  },
})

// Output the agent-browser command
console.log(
  `agent-browser cookies set "sb-${SUPABASE_PROJECT_REF}-auth-token.0" '${cookieValue}' --domain ${APP_DOMAIN} --path /`,
)
