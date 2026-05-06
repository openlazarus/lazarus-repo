/**
 * Discord OAuth Callback Handler
 *
 * Handles the OAuth callback from Discord after a user adds the bot to their server.
 * Creates a discord_connection record linking the Discord guild to a Lazarus workspace.
 */

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const guildId = requestUrl.searchParams.get('guild_id')
  const state = requestUrl.searchParams.get('state') // Contains workspaceId
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('[Discord OAuth] Error:', error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/?discord=error&message=${encodeURIComponent(errorDescription || error)}`,
    )
  }

  if (!code || !guildId) {
    console.error('[Discord OAuth] Missing code or guild_id')
    return NextResponse.redirect(
      `${requestUrl.origin}/?discord=error&message=Missing+authorization+code+or+guild+ID`,
    )
  }

  // Parse state to get workspaceId
  let workspaceId: string | null = null
  try {
    const stateData = state ? JSON.parse(atob(state)) : null
    workspaceId = stateData?.workspaceId
  } catch (e) {
    console.error('[Discord OAuth] Failed to parse state:', e)
  }

  if (!workspaceId) {
    return NextResponse.redirect(
      `${requestUrl.origin}/?discord=error&message=Missing+workspace+context`,
    )
  }

  try {
    // Get credentials - check both prefixed and non-prefixed env vars
    const clientId =
      process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const redirectUri = `${requestUrl.origin}/api/auth/callback/discord`

    // Debug logging for configuration issues
    console.log('[Discord OAuth] Config check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri,
    })

    if (!clientId || !clientSecret) {
      console.error(
        '[Discord OAuth] Missing credentials - DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set',
      )
      return NextResponse.redirect(
        `${requestUrl.origin}/?discord=error&message=Discord+integration+not+configured+on+server`,
      )
    }

    // Exchange code for access token (to get guild info)
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('[Discord OAuth] Token exchange failed:', errorData)
      // Parse Discord error for more helpful message
      try {
        const errorJson = JSON.parse(errorData)
        const errorMessage =
          errorJson.error_description ||
          errorJson.error ||
          'Token exchange failed'
        return NextResponse.redirect(
          `${requestUrl.origin}/?discord=error&message=${encodeURIComponent(errorMessage)}`,
        )
      } catch {
        return NextResponse.redirect(
          `${requestUrl.origin}/?discord=error&message=Failed+to+exchange+authorization+code`,
        )
      }
    }

    const tokenData = await tokenResponse.json()

    // Get guild information
    let guildName = 'Unknown Server'
    try {
      const guildResponse = await fetch(
        `https://discord.com/api/guilds/${guildId}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        },
      )

      if (guildResponse.ok) {
        const guildData = await guildResponse.json()
        guildName = guildData.name
      }
    } catch (e) {
      console.warn('[Discord OAuth] Failed to fetch guild info:', e)
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
      .from('discord_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('guild_id', guildId)
      .single()

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('discord_connections')
        .update({
          guild_name: guildName,
          enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)

      return NextResponse.redirect(
        `${requestUrl.origin}/?discord=reconnected&guild=${encodeURIComponent(guildName)}`,
      )
    }

    // Create new connection
    const { error: insertError } = await supabase
      .from('discord_connections')
      .insert({
        workspace_id: workspaceId,
        guild_id: guildId,
        guild_name: guildName,
        created_by: user.id,
        enabled: true,
        settings: {
          respondToMentions: true,
          respondToDMs: true,
          useThreads: true,
        },
      })

    if (insertError) {
      console.error('[Discord OAuth] Failed to create connection:', insertError)
      return NextResponse.redirect(
        `${requestUrl.origin}/?discord=error&message=${encodeURIComponent(insertError.message)}`,
      )
    }

    return NextResponse.redirect(
      `${requestUrl.origin}/?discord=connected&guild=${encodeURIComponent(guildName)}`,
    )
  } catch (error) {
    console.error('[Discord OAuth] Unexpected error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return NextResponse.redirect(
      `${requestUrl.origin}/?discord=error&message=${encodeURIComponent(errorMessage)}`,
    )
  }
}
