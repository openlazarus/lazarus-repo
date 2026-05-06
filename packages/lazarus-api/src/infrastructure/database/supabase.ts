/**
 * Supabase Client Configuration
 *
 * Centralized Supabase client for backend services.
 * Uses service role key to bypass RLS for server-side operations.
 *
 * Database types are auto-generated — regenerate with:
 *   supabase gen types typescript --project-id <your-project-id> > src/infrastructure/database/database.types.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import '../../load-env'
import type { Database } from './database.types'

export type { Database }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Supabase] Missing required environment variables:')
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  throw new Error('Supabase configuration is incomplete. Check environment variables.')
}

/**
 * Supabase client with service role permissions
 * This client bypasses RLS and should only be used server-side
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  },
)

/**
 * Create a Supabase client with user context (respects RLS)
 */
export function createUserSupabaseClient(userToken: string): SupabaseClient<Database> {
  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }

  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  })
}

export default supabase
