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
      return Response.json(
        { error: 'Workspace name is required' },
        { status: 400 },
      )
    }

    // Get workspace and check team membership
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('team_id, user_id')
      .eq('id', id)
      .single()

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if user is the workspace owner or team admin
    let hasPermission = workspace.user_id === user.id

    if (!hasPermission && workspace.team_id) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', workspace.team_id)
        .eq('user_id', user.id)
        .single()

      hasPermission = !!(
        membership && ['owner', 'admin'].includes(membership.role)
      )
    }

    if (!hasPermission) {
      return Response.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      )
    }

    // Update workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update workspace:', error)
      return Response.json(
        { error: 'Failed to update workspace', details: error.message },
        { status: 500 },
      )
    }

    return Response.json({ success: true, workspace: data })
  } catch (error) {
    console.error('Update workspace error:', error)
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

    // Get workspace and check team membership
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('team_id, user_id')
      .eq('id', id)
      .single()

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Check if user is the workspace owner or team owner
    let hasPermission = workspace.user_id === user.id

    if (!hasPermission && workspace.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('owner_id')
        .eq('id', workspace.team_id)
        .single()

      hasPermission = !!(team && team.owner_id === user.id)
    }

    if (!hasPermission) {
      return Response.json(
        {
          error: 'Only the workspace owner or team owner can delete it',
        },
        { status: 403 },
      )
    }

    // Delete all workspace members
    await supabase.from('workspace_members').delete().eq('workspace_id', id)

    // Delete all invitations for this workspace
    await supabase.from('invitations').delete().eq('workspace_id', id)

    // Delete the workspace
    const { error } = await supabase.from('workspaces').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete workspace:', error)
      return Response.json(
        { error: 'Failed to delete workspace', details: error.message },
        { status: 500 },
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete workspace error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
