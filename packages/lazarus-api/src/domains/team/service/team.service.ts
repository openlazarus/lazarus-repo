/**
 * Team Service
 *
 * Business logic for team (workspace) and member management.
 * Authorization checks + delegation to team repository.
 */

import { workspaceRepository } from '@domains/workspace/repository/workspace.repository'
import { generateSlugFromName, ensureUniqueSlug } from '@utils/slug-generator'
import { teamRepository } from '@domains/team/repository/team.repository'
import type {
  Team,
  TeamMember,
  TeamWithMembers,
  CreateTeamParams,
  UpdateTeamParams,
} from '@domains/team/types/team.types'
import type { ITeamService } from './team.service.interface'

function toTeam(ws: any): Team {
  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    owner_id: ws.owner_id,
    description: ws.description,
    avatar: ws.avatar,
    settings: ws.settings as Record<string, any> | null,
    created_at: ws.created_at,
    updated_at: ws.updated_at,
  }
}

function toTeamWithMembers(ws: any, members: TeamMember[]): TeamWithMembers {
  return {
    ...toTeam(ws),
    members,
    member_count: members.length,
    workspace_count: 1,
  }
}

export class TeamService implements ITeamService {
  private async generateSlug(name: string): Promise<string> {
    const baseSlug = generateSlugFromName(name, { maxLength: 50 })
    return ensureUniqueSlug(baseSlug, (slug) => teamRepository.slugExists(slug), {
      maxAttempts: 10,
      prefix: 'team',
    })
  }

  async createTeam(params: CreateTeamParams): Promise<Team> {
    const slug = params.slug || (await this.generateSlug(params.name))

    const ws = await teamRepository.createWorkspace({
      name: params.name,
      slug,
      owner_id: params.owner_id,
      description: params.description || null,
      avatar: params.avatar || null,
      settings: params.settings || {
        defaultRole: 'member',
        allowInvites: true,
        requireApproval: false,
      },
    })

    // Owner is inserted into workspace_members by DB trigger add_workspace_creator_as_member.

    return toTeam(ws)
  }

  async getTeam(teamId: string, userId?: string): Promise<TeamWithMembers | null> {
    if (userId) {
      const isMember = await workspaceRepository.isWorkspaceMember(userId, teamId)
      if (!isMember) {
        throw new Error('User is not a member of this team')
      }
    }

    const ws = await teamRepository.getWorkspaceWithMembers(teamId)
    if (!ws) return null

    return toTeamWithMembers(ws, ws.members as TeamMember[])
  }

  async listTeams(userId: string): Promise<TeamWithMembers[]> {
    const wsIds = await teamRepository.getMembershipWorkspaceIds(userId)
    if (wsIds.length === 0) return []

    const workspaces = await teamRepository.getWorkspacesWithMembers(wsIds)

    return workspaces.map((ws) => toTeamWithMembers(ws, ws.members as TeamMember[]))
  }

  async updateTeam(teamId: string, userId: string, params: UpdateTeamParams): Promise<Team> {
    const role = await teamRepository.getMemberRole(teamId, userId)
    if (role !== 'owner') {
      throw new Error('Only team owners can update team details')
    }

    const ws = await teamRepository.updateWorkspace(teamId, params)
    return toTeam(ws)
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const role = await teamRepository.getMemberRole(teamId, userId)
    if (role !== 'owner') {
      throw new Error('Only team owners can delete the team')
    }

    await teamRepository.softDeleteWorkspace(teamId)
  }

  async getMembers(teamId: string, userId: string): Promise<TeamMember[]> {
    const isMember = await workspaceRepository.isWorkspaceMember(userId, teamId)
    if (!isMember) {
      throw new Error('User is not a member of this team')
    }

    return (await teamRepository.getMembersByWorkspace(teamId)) as TeamMember[]
  }

  async addMember(
    teamId: string,
    userId: string,
    targetUserId: string,
    role: 'admin' | 'member' = 'member',
  ): Promise<TeamMember> {
    const isAdmin = await workspaceRepository.isWorkspaceAdmin(userId, teamId)
    if (!isAdmin) {
      throw new Error('Only admins can add members to the team')
    }

    const existing = await teamRepository.getMember(teamId, targetUserId)
    if (existing) {
      throw new Error('User is already a member of this team')
    }

    return (await teamRepository.insertMember({
      workspace_id: teamId,
      user_id: targetUserId,
      role,
      invited_by: userId,
    })) as TeamMember
  }

  async removeMember(teamId: string, userId: string, targetUserId: string): Promise<void> {
    const isAdmin = await workspaceRepository.isWorkspaceAdmin(userId, teamId)
    if (!isAdmin) {
      throw new Error('Only admins can remove members from the team')
    }

    const target = await teamRepository.getMember(teamId, targetUserId)
    if (target?.role === 'owner') {
      throw new Error('Cannot remove the team owner')
    }

    await teamRepository.deleteMember(teamId, targetUserId)
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    targetUserId: string,
    newRole: 'admin' | 'member',
  ): Promise<TeamMember> {
    const isAdmin = await workspaceRepository.isWorkspaceAdmin(userId, teamId)
    if (!isAdmin) {
      throw new Error('Only admins can update member roles')
    }

    const target = await teamRepository.getMember(teamId, targetUserId)
    if (target?.role === 'owner') {
      throw new Error('Cannot change the role of the team owner')
    }

    return (await teamRepository.updateMemberRole(teamId, targetUserId, newRole)) as TeamMember
  }

  async getUserRole(teamId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
    const role = await teamRepository.getMemberRole(teamId, userId)
    return (role as 'owner' | 'admin' | 'member') || null
  }
}

export const teamService: ITeamService = new TeamService()
