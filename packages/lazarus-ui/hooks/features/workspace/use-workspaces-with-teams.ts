import { useCallback, useEffect, useMemo, useState } from 'react'

import { Workspace, WorkspaceRole } from '@/model/workspace'
import { createClient } from '@/utils/supabase/client'

export interface WorkspaceWithMembership extends Workspace {
  user_role?: WorkspaceRole
  is_owner?: boolean
  member_count?: number
}

// Create a single supabase client instance outside the hook to avoid re-creation
const supabase = createClient()

/**
 * All workspaces with membership information hook
 *
 * **When to use**: When you need all workspaces the user has access to with embedded membership info
 *
 * **Features**:
 * - Fetches all workspaces user is a member of or owns
 * - Includes user role (owner/admin/editor/member/viewer) for each workspace
 * - Includes is_owner flag for ownership checks
 * - Includes member_count for display purposes
 * - Uses direct Supabase query with joins for optimal performance
 *
 * **Use cases**:
 * - Developer section (API key management across all workspaces)
 * - Permission checks requiring ownership information
 * - Workspace listing with role badges
 * - Cross-workspace operations
 *
 * @returns All workspaces with membership info and role flags
 *
 * @example
 * ```tsx
 * function WorkspaceList() {
 *   const { workspaces, loading } = useAllWorkspaces();
 *
 *   return workspaces.map(ws => (
 *     <div>
 *       {ws.name} ({ws.user_role})
 *       {ws.is_owner && <Badge>Owner</Badge>}
 *       <span>{ws.member_count} members</span>
 *     </div>
 *   ));
 * }
 * ```
 */
export const useAllWorkspaces = (options?: { filterByRoles?: string[] }) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Memoize filterByRoles to avoid infinite loops from array reference changes
  const filterByRolesKey = useMemo(
    () => options?.filterByRoles?.sort().join(',') || '',
    [options?.filterByRoles],
  )

  const fetchWorkspaces = useCallback(async () => {
    const filterByRoles = filterByRolesKey ? filterByRolesKey.split(',') : null
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get workspaces the user is a member of through workspace_members
      let query = supabase
        .from('workspace_members')
        .select(
          `
          workspace_id,
          role,
          workspaces (
            id,
            name,
            description,
            slug,
            owner_id,
            user_id,
            settings,
            avatar,
            color,
            needs_onboarding,
            created_at,
            updated_at
          )
        `,
        )
        .eq('user_id', user.id)

      // Filter by roles if specified
      if (filterByRoles && filterByRoles.length > 0) {
        query = query.in('role', filterByRoles)
      }

      const { data: memberData, error: memberError } = await query

      if (memberError) throw memberError

      // Get member counts for each workspace
      const workspaceIds = (memberData || [])
        .map((m: any) => m.workspaces?.id)
        .filter(Boolean)

      let memberCounts: Record<string, number> = {}
      if (workspaceIds.length > 0) {
        const { data: countData } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .in('workspace_id', workspaceIds)

        memberCounts = (countData || []).reduce(
          (acc: Record<string, number>, item: any) => {
            acc[item.workspace_id] = (acc[item.workspace_id] || 0) + 1
            return acc
          },
          {},
        )
      }

      // Transform the data to include membership info
      const workspacesWithMembership: WorkspaceWithMembership[] = (
        memberData || []
      )
        .filter((member: any) => member.workspaces)
        .map((member: any) => {
          const workspace = member.workspaces

          return {
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            slug: workspace.slug,
            path: '', // Will be populated from backend if needed
            ownerId: workspace.owner_id || workspace.user_id,
            owner_id: workspace.owner_id,
            userId: workspace.user_id,
            user_id: workspace.user_id,
            createdAt: workspace.created_at,
            updatedAt: workspace.updated_at,
            metadata: workspace.settings,
            avatar: workspace.avatar,
            color: workspace.color,
            needsOnboarding: workspace.needs_onboarding,
            user_role: member.role as WorkspaceRole,
            userRole: member.role as WorkspaceRole,
            is_owner: workspace.owner_id === user.id,
            isOwner: workspace.owner_id === user.id,
            member_count: memberCounts[workspace.id] || 1,
            memberCount: memberCounts[workspace.id] || 1,
          }
        })

      setWorkspaces(workspacesWithMembership)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch workspaces'),
      )
      console.error('Error fetching workspaces:', err)
    } finally {
      setLoading(false)
    }
  }, [filterByRolesKey])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    workspaces,
    loading,
    error,
    refetch: fetchWorkspaces,
  }
}

// Export type alias for backward compatibility
export type WorkspaceWithOrg = WorkspaceWithMembership
