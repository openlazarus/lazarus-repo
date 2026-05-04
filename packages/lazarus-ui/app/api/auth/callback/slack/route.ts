/**
 * Slack OAuth Callback Handler
 *
 * Handles the OAuth callback from Slack after a user installs the app.
 * Creates a slack_connection record linking the Slack team to a Lazarus workspace.
 */

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state') // Contains workspaceId
  const error = requestUrl.searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('[Slack OAuth] Error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/?slack=error&message=${encodeURIComponent(error)}`,
    )
  }

  if (!code) {
    console.error('[Slack OAuth] Missing code')
    return NextResponse.redirect(
      `${requestUrl.origin}/?slack=error&message=Missing+authorization+code`,
    )
  }

  // Parse state to get workspaceId
  let workspaceId: string | null = null
  try {
    const stateData = state ? JSON.parse(atob(state)) : null
    workspaceId = stateData?.workspaceId
  } catch (e) {
    console.error('[Slack OAuth] Failed to parse state:', e)
  }

  if (!workspaceId) {
    return NextResponse.redirect(
      `${requestUrl.origin}/?slack=error&message=Missing+workspace+context`,
    )
  }

  try {
    // Get credentials - check both prefixed and non-prefixed env vars
    const clientId =
      process.env.SLACK_CLIENT_ID || process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri =
      process.env.SLACK_REDIRECT_URI ||
      `${requestUrl.origin}/api/auth/callback/slack`

    // Debug logging for configuration issues
    console.log('[Slack OAuth] Config check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri,
    })

    if (!clientId || !clientSecret) {
      console.error(
        '[Slack OAuth] Missing credentials - SLACK_CLIENT_ID or SLACK_CLIENT_SECRET not set',
      )
      return NextResponse.redirect(
        `${requestUrl.origin}/?slack=error&message=Slack+integration+not+configured+on+server`,
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('[Slack OAuth] Token exchange failed:', tokenData.error)
      return NextResponse.redirect(
        `${requestUrl.origin}/?slack=error&message=${encodeURIComponent(tokenData.error || 'Token exchange failed')}`,
      )
    }

    const { access_token, team, bot_user_id, authed_user } = tokenData

    if (!access_token || !team?.id) {
      console.error('[Slack OAuth] Missing token or team info')
      return NextResponse.redirect(
        `${requestUrl.origin}/?slack=error&message=Invalid+response+from+Slack`,
      )
    }

    // Get current user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${requestUrl.origin}/signin`)
    }

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('slack_team_id', team.id)
      .single()

    if (existingConnection) {
      // Update existing connection with new token
      await supabase
        .from('slack_connections')
        .update({
          slack_team_name: team.name,
          bot_token: access_token,
          bot_user_id: bot_user_id,
          enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)

      return NextResponse.redirect(
        `${requestUrl.origin}/?slack=reconnected&team=${encodeURIComponent(team.name)}`,
      )
    }

    // Create new connection
    const { error: insertError } = await supabase
      .from('slack_connections')
      .insert({
        workspace_id: workspaceId,
        slack_team_id: team.id,
        slack_team_name: team.name,
        bot_token: access_token, // Note: Should be encrypted in production
        bot_user_id: bot_user_id,
        created_by: user.id,
        enabled: true,
        settings: {
          respondToMentions: true,
          respondToDMs: true,
          useThreads: true,
        },
      })

    if (insertError) {
      console.error('[Slack OAuth] Failed to create connection:', insertError)
      return NextResponse.redirect(
        `${requestUrl.origin}/?slack=error&message=${encodeURIComponent(insertError.message)}`,
      )
    }

    return NextResponse.redirect(
      `${requestUrl.origin}/?slack=connected&team=${encodeURIComponent(team.name)}`,
    )
  } catch (error) {
    console.error('[Slack OAuth] Unexpected error:', error)
    return NextResponse.redirect(
      `${requestUrl.origin}/?slack=error&message=An+unexpected+error+occurred`,
    )
  }
}
