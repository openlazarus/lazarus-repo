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
      workspaceId,
      role = 'editor',
    }: {
      email: string
      workspaceId: string
      role?: string
    } = body

    if (!email || !workspaceId) {
      return Response.json(
        { error: 'Missing required fields: email, workspaceId' },
        { status: 400 },
      )
    }

    // Validate role
    const validRoles = ['admin', 'developer', 'editor', 'member', 'viewer']
    if (!validRoles.includes(role)) {
      return Response.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 },
      )
    }

    // Get workspace details and verify user has permission to invite
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', workspaceId)
      .single()

    if (wsError || !workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if user is owner or admin of the workspace
    const isOwner = workspace.owner_id === user.id
    let isAdmin = false

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()

      isAdmin = membership?.role === 'admin' || membership?.role === 'owner'
    }

    if (!isOwner && !isAdmin) {
      return Response.json(
        { error: 'Only workspace owners and admins can invite members' },
        { status: 403 },
      )
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

    // Check if user is already a member (RPC bypasses profiles RLS via SECURITY DEFINER)
    const { data: isMember } = await supabase.rpc(
      'is_workspace_member_by_email',
      { p_workspace_id: workspaceId, p_email: email },
    )

    if (isMember) {
      return Response.json(
        { error: 'This user is already a member of this workspace' },
        { status: 409 },
      )
    }

    // Check if there's already an active pending invitation
    const { data: existingInvitation } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .is('accepted_at', null)
      .is('declined_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingInvitation) {
      return Response.json(
        { error: 'An active invitation has already been sent to this email' },
        { status: 409 },
      )
    }

    // Create invitation record in database
    // The DB trigger will auto-expire any old pending invitations for this (workspace, email)
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: user.id,
      })
      .select('code')
      .single()

    if (invitationError) {
      console.error('Failed to create invitation record:', invitationError)

      // Provide a user-friendly message for constraint violations
      if (invitationError.message.includes('unique constraint')) {
        return Response.json(
          { error: 'An invitation is already pending for this email' },
          { status: 409 },
        )
      }

      return Response.json(
        { error: 'Failed to create invitation. Please try again.' },
        { status: 500 },
      )
    }

    // Generate accept URL with the invitation code
    const host = request.headers.get('host')
    const origin =
      request.headers.get('origin') ||
      (host ? `https://${host}` : process.env.NEXT_PUBLIC_APP_URL)
    const acceptUrl = `${origin}/accept-invitation?code=${invitation.code}`

    // Load and compile email template
    const templatePath = join(
      process.cwd(),
      'emails',
      'workspace-invitation.html',
    )
    let templateSource: string
    try {
      templateSource = readFileSync(templatePath, 'utf-8')
    } catch {
      // Fall back to team-invitation template if workspace-invitation doesn't exist
      templateSource = readFileSync(
        join(process.cwd(), 'emails', 'team-invitation.html'),
        'utf-8',
      )
    }
    const template = Handlebars.compile(templateSource)

    const html = template({
      workspaceName: workspace.name,
      // Keep organizationName for backwards compatibility with old template
      organizationName: workspace.name,
      role: role.charAt(0).toUpperCase() + role.slice(1),
      inviterName,
      inviterEmail: inviter?.email,
      inviteeEmail: email,
      acceptUrl,
    })

    // Send invitation email via Resend
    const { data: emailData, error: emailError } =
      await getResend().emails.send({
        from: 'Lazarus <team@openlazarus.ai>',
        to: email,
        subject: `You've been invited to join ${workspace.name}`,
        html,
      })

    if (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Delete the invitation if email fails
      await supabase
        .from('workspace_invitations')
        .delete()
        .eq('code', invitation.code)

      return Response.json(
        {
          error: 'Failed to send invitation email',
          details: emailError.message || emailError,
        },
        { status: 500 },
      )
    }

    // Check if user already exists and add them immediately
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      // Add them to the workspace immediately
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: existingProfile.id,
          role,
          invited_by: user.id,
        })

      if (memberError && !memberError.message.includes('duplicate')) {
        console.error('Failed to add workspace member:', memberError)
      } else {
        // Mark invitation as accepted since user exists
        await supabase
          .from('workspace_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('code', invitation.code)
      }
    }

    return Response.json({
      success: true,
      message: 'Invitation sent successfully',
      emailId: emailData?.id,
      userExists: !!existingProfile,
    })
  } catch (error) {
    console.error('Workspace invitation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to fetch pending invitations for a workspace
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return Response.json(
        { error: 'Missing workspaceId parameter' },
        { status: 400 },
      )
    }

    // Verify user has access to this workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .single()

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const isOwner = workspace.owner_id === user.id
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single()

      hasAccess = !!membership
    }

    if (!hasAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch pending invitations
    const { data: invitations, error } = await supabase
      .from('workspace_invitations')
      .select(
        `
        id,
        email,
        role,
        created_at,
        expires_at,
        invited_by,
        profiles:invited_by (first_name, last_name, email)
      `,
      )
      .eq('workspace_id', workspaceId)
      .is('accepted_at', null)
      .is('declined_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch invitations:', error)
      return Response.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 },
      )
    }

    return Response.json({ invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE endpoint to cancel an invitation
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return Response.json(
        { error: 'Missing invitation id parameter' },
        { status: 400 },
      )
    }

    // Get the invitation to verify permissions
    const { data: invitation } = await supabase
      .from('workspace_invitations')
      .select('workspace_id, invited_by')
      .eq('id', invitationId)
      .single()

    if (!invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user can cancel this invitation (owner, admin, or original inviter)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', invitation.workspace_id)
      .single()

    const isOwner = workspace?.owner_id === user.id
    const isInviter = invitation.invited_by === user.id
    let isAdmin = false

    if (!isOwner && !isInviter) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', invitation.workspace_id)
        .eq('user_id', user.id)
        .single()

      isAdmin = membership?.role === 'admin'
    }

    if (!isOwner && !isAdmin && !isInviter) {
      return Response.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Delete the invitation
    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      console.error('Failed to delete invitation:', error)
      return Response.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 },
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error canceling invitation:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
