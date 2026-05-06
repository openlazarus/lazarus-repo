import { createClient } from '@/utils/supabase/server'

/**
 * Transfer workspace ownership to another user
 * This removes the workspace from the current team and assigns it to the new owner's personal team
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { id: workspaceId } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { newOwnerId } = body

    if (!newOwnerId) {
      return Response.json(
        { error: 'New owner ID is required' },
        { status: 400 },
      )
    }

    // Get workspace and check team membership
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('team_id, user_id, name')
      .eq('id', workspaceId)
      .single()

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if current user is the team owner (only team owners can transfer workspaces)
    if (!workspace.team_id) {
      return Response.json(
        { error: 'Workspace is not part of a team' },
        { status: 400 },
      )
    }

    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', workspace.team_id)
      .single()

    if (!team || team.owner_id !== user.id) {
      return Response.json(
        { error: 'Only the team owner can transfer workspace ownership' },
        { status: 403 },
      )
    }

    // Verify the new owner exists and is a member of the team
    const { data: newOwnerMembership } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', workspace.team_id)
      .eq('user_id', newOwnerId)
      .single()

    if (!newOwnerMembership) {
      return Response.json(
        { error: 'New owner must be a member of the team' },
        { status: 400 },
      )
    }

    // Get the new owner's personal team
    const { data: personalTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', newOwnerId)
      .eq('settings->is_personal', true)
      .single()

    if (!personalTeam) {
      return Response.json(
        { error: 'Could not find personal team for the new owner' },
        { status: 400 },
      )
    }

    // Transfer the workspace:
    // 1. Update user_id (owner) to new owner
    // 2. Update team_id to new owner's personal team
    const { data: updatedWorkspace, error: updateError } = await supabase
      .from('workspaces')
      .update({
        user_id: newOwnerId,
        team_id: personalTeam.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to transfer workspace:', updateError)
      return Response.json(
        { error: 'Failed to transfer workspace', details: updateError.message },
        { status: 500 },
      )
    }

    // Update workspace members - make the new owner an owner in the workspace
    // First, check if new owner is already a workspace member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', newOwnerId)
      .single()

    if (existingMember) {
      // Update to owner role
      await supabase
        .from('workspace_members')
        .update({ role: 'owner' })
        .eq('workspace_id', workspaceId)
        .eq('user_id', newOwnerId)
    } else {
      // Add as owner
      await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: newOwnerId,
        role: 'owner',
      })
    }

    // Remove old owner from workspace members if they exist (optional - could keep them as member)
    // For now, we keep them as they might want continued access

    return Response.json({
      success: true,
      workspace: updatedWorkspace,
      message: `Workspace "${workspace.name}" has been transferred to the new owner`,
    })
  } catch (error) {
    console.error('Transfer workspace error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
