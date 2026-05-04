import { NextResponse } from 'next/server'

import { createClient, createServiceRoleClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const redirectBase = `${requestUrl.origin}/auth/confirm`

  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const errorDesc = requestUrl.searchParams.get('error_description')

  if (errorDesc) {
    return NextResponse.redirect(
      `${redirectBase}?status=error&message=${encodeURIComponent(errorDesc)}`,
    )
  }

  if (code) {
    // Exchange the code using the cookie-aware client (required for PKCE verifier).
    // This does create a new session in cookies, but the confirm page will call
    // refreshSession() client-side to reconcile.
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(
        `${redirectBase}?status=error&message=${encodeURIComponent(error.message)}`,
      )
    }

    // Sync the updated email/phone to profiles via service role
    if (data.user) {
      const admin = createServiceRoleClient()
      const user = data.user
      const updates: Record<string, unknown> = {}

      if (user.email && !user.email.endsWith('@phone.lazarusconnect.com')) {
        updates.email = user.email
        updates.email_verified = true
      }
      if (user.phone) {
        updates.phone_number = user.phone
      }

      if (Object.keys(updates).length > 0) {
        await admin.from('profiles').update(updates).eq('id', user.id)
      }
    }

    return NextResponse.redirect(
      `${redirectBase}?status=success&type=${type || 'email_change'}`,
    )
  }

  return NextResponse.redirect(
    `${redirectBase}?status=error&message=${encodeURIComponent('Missing confirmation parameters')}`,
  )
}
