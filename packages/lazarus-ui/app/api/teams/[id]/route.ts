import { createClient } from '@/utils/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return Response.json({ error: 'Team name is required' }, { status: 400 })
    }

    // Check if user is admin or owner of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', id)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return Response.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      )
    }

    // Update team
    const { data, error } = await supabase
      .from('teams')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update team:', error)
      return Response.json(
        { error: 'Failed to update team', details: error.message },
        { status: 500 },
      )
    }

    return Response.json({ success: true, team: data })
  } catch (error) {
    console.error('Update team error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is the owner of the team
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.owner_id !== user.id) {
      return Response.json(
        { error: 'Only the team owner can delete it' },
        { status: 403 },
      )
    }

    // Delete all workspace members for workspaces in this team
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('team_id', id)

    if (workspaces && workspaces.length > 0) {
      const workspaceIds = workspaces.map((ws) => ws.id)
      await supabase
        .from('workspace_members')
        .delete()
        .in('workspace_id', workspaceIds)
    }

    // Delete all workspaces in this team
    await supabase.from('workspaces').delete().eq('team_id', id)

    // Delete all invitations for this team
    await supabase.from('invitations').delete().eq('team_id', id)

    // Delete all team members
    await supabase.from('team_members').delete().eq('team_id', id)

    // Delete the team
    const { error } = await supabase.from('teams').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete team:', error)
      return Response.json(
        { error: 'Failed to delete team', details: error.message },
        { status: 500 },
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete team error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
