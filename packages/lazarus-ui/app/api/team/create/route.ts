import { createClient, createServiceRoleClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    // Use regular client for authentication check
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description }: { name: string; description?: string } = body

    if (!name || name.trim().length === 0) {
      return Response.json(
        { error: 'Missing required field: name' },
        { status: 400 },
      )
    }

    // Use service role client for database operations to bypass RLS
    // This is safe because we've already verified the user is authenticated
    const serviceClient = createServiceRoleClient()

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    // Create the team
    const { data: team, error: teamError } = await serviceClient
      .from('teams')
      .insert({
        name: name.trim(),
        slug,
        owner_id: user.id,
        description: description?.trim() || null,
        settings: {
          defaultRole: 'member',
          allowInvites: true,
          requireApproval: false,
        },
      })
      .select()
      .single()

    if (teamError) {
      console.error('Failed to create team:', teamError)
      return Response.json(
        { error: 'Failed to create team', details: teamError.message },
        { status: 500 },
      )
    }

    // Add creator as owner member
    const { error: memberError } = await serviceClient
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Failed to add team member:', memberError)
      // Try to clean up the team if member creation fails
      await serviceClient.from('teams').delete().eq('id', team.id)
      return Response.json(
        { error: 'Failed to add team owner', details: memberError.message },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      team,
    })
  } catch (error) {
    console.error('Team creation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
