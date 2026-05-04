/**
 * Setup script to create an authenticated session for E2E tests
 * Uses Supabase admin API to generate a session for the test user
 *
 * Run: node tests/setup-auth.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.test.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.test.local')

  if (!fs.existsSync(envPath)) {
    console.error('❌ Missing .env.test.local file')
    console.error(
      '   Copy .env.test.example to .env.test.local and fill in values',
    )
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      env[key.trim()] = valueParts.join('=').trim()
    }
  }

  return env
}

const AUTH_STATE_FILE = path.join(__dirname, '.auth-state.json')

async function setupAuth() {
  console.log('🔐 Setting up E2E test authentication...\n')

  const env = loadEnv()

  const SUPABASE_URL = env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  const TEST_USER_EMAIL = env.TEST_USER_EMAIL

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TEST_USER_EMAIL) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  // Create admin client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Get user by email from profiles table (more reliable than paginated auth.users)
    console.log(`1. Looking up user: ${TEST_USER_EMAIL}`)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', TEST_USER_EMAIL)
      .single()

    if (profileError || !profile) {
      throw new Error(`User not found in profiles: ${TEST_USER_EMAIL}`)
    }

    const testUser = { id: profile.id, email: profile.email }
    console.log(`   ✓ Found user: ${testUser.id}`)

    // Generate magic link to get OTP
    console.log('2. Generating magic link...')

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: TEST_USER_EMAIL,
      })

    if (linkError) {
      throw new Error(`Failed to generate link: ${linkError.message}`)
    }

    const { properties } = linkData
    console.log('   ✓ Magic link generated (OTP: ' + properties.email_otp + ')')

    // Verify the OTP to get session tokens
    console.log('3. Verifying OTP...')

    const { data: sessionData, error: verifyError } =
      await supabase.auth.verifyOtp({
        email: TEST_USER_EMAIL,
        token: properties.email_otp,
        type: 'email',
      })

    if (verifyError) {
      throw new Error(`Failed to verify OTP: ${verifyError.message}`)
    }

    if (!sessionData.session) {
      throw new Error('No session returned from OTP verification')
    }

    console.log('   ✓ OTP verified')

    // Save auth state for tests
    const authState = {
      user: {
        id: testUser.id,
        email: testUser.email,
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
      },
      created_at: new Date().toISOString(),
    }

    fs.writeFileSync(AUTH_STATE_FILE, JSON.stringify(authState, null, 2))
    console.log(`4. Auth state saved to: .auth-state.json`)

    console.log('\n✅ Auth setup complete!')
    console.log(
      `   Token expires: ${new Date(sessionData.session.expires_at * 1000).toISOString()}`,
    )

    return authState
  } catch (error) {
    console.error('\n❌ Auth setup failed:', error.message)
    process.exit(1)
  }
}

// Export for use in other scripts
module.exports = { setupAuth, loadEnv, AUTH_STATE_FILE }

// Run if called directly
if (require.main === module) {
  setupAuth()
}
