import { readFileSync } from 'fs'
import { join } from 'path'

import Handlebars from 'handlebars'
import { Resend } from 'resend'

import { createClient } from '@/utils/supabase/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      teamId,
      workspaceId,
      role = 'member',
    }: {
      email: string
      teamId: string
      workspaceId?: string
      role?: string
    } = body

    if (!email || !teamId) {
      return Response.json(
        { error: 'Missing required fields: email, teamId' },
        { status: 400 },
      )
    }

    // Get team details
    const { data: team, error: orgError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (orgError || !team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get inviter profile
    const { data: inviter } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    const inviterName =
      inviter?.first_name && inviter?.last_name
        ? `${inviter.first_name} ${inviter.last_name}`
        : inviter?.email || 'Someone'

    // Get workspace details if provided
    let workspace = null
    if (workspaceId) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single()
      workspace = ws
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    // Generate accept URL with token
    const token = Buffer.from(
      JSON.stringify({
        email,
        teamId,
        teamName: team.name,
        workspaceId,
        workspaceName: workspace?.name,
        role,
        invitedBy: user.id,
        timestamp: Date.now(),
      }),
    ).toString('base64')

    const host = request.headers.get('host')
    const origin =
      request.headers.get('origin') ||
      (host ? `https://${host}` : process.env.NEXT_PUBLIC_APP_URL)
    const acceptUrl = `${origin}/accept-invitation?token=${token}`

    // Create invitation record in database
    const { error: invitationError } = await supabase
      .from('invitations')
      .insert({
        email,
        team_id: teamId,
        workspace_id: workspaceId,
        role,
        invited_by: user.id,
        token,
      })

    if (invitationError) {
      console.error('Failed to create invitation record:', invitationError)
      return Response.json(
        {
          error: 'Failed to create invitation record',
          details: invitationError.message,
        },
        { status: 500 },
      )
    }

    // Load and compile email template
    const templatePath = join(process.cwd(), 'emails', 'team-invitation.html')
    const templateSource = readFileSync(templatePath, 'utf-8')
    const template = Handlebars.compile(templateSource)

    const html = template({
      teamName: team.name,
      workspaceName: workspace?.name,
      role: role.charAt(0).toUpperCase() + role.slice(1),
      inviterName,
      inviterEmail: inviter?.email,
      inviteeEmail: email,
      acceptUrl,
    })

    // Send invitation email via Resend
    const { data: emailData, error: emailError } =
      await getResend().emails.send({
        from: 'Lazarus Team <team@openlazarus.ai>',
        to: email,
        subject: `You've been invited to join ${team.name}`,
        html,
      })

    if (emailError) {
      console.error('Failed to send invitation email:', emailError)
      return Response.json(
        {
          error: 'Failed to send invitation email',
          details: emailError.message || emailError,
        },
        { status: 500 },
      )
    }

    // If user exists, add them directly to the team
    if (existingProfile) {
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: existingProfile.id,
          role,
          invited_by: user.id,
        })

      if (memberError && !memberError.message.includes('duplicate')) {
        console.error('Failed to add team member:', memberError)
      }

      // If workspace is specified, add them to the workspace too
      if (workspaceId) {
        const { error: wsMemberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: existingProfile.id,
            role,
            invited_by: user.id,
          })

        if (wsMemberError && !wsMemberError.message.includes('duplicate')) {
          console.error('Failed to add workspace member:', wsMemberError)
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Invitation sent successfully',
      emailId: emailData?.id,
      userExists: !!existingProfile,
    })
  } catch (error) {
    console.error('Team invitation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
