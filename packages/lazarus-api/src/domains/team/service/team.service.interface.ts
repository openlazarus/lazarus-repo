import type {
  Team,
  TeamMember,
  TeamWithMembers,
  CreateTeamParams,
  UpdateTeamParams,
} from '@domains/team/types/team.types'

export interface ITeamService {
  /** Create a new team. */
  createTeam(params: CreateTeamParams): Promise<Team>

  /** Get a team with its members. */
  getTeam(teamId: string, userId?: string): Promise<TeamWithMembers | null>

  /** List all teams the user belongs to. */
  listTeams(userId: string): Promise<TeamWithMembers[]>

  /** Update team details (owner-only). */
  updateTeam(teamId: string, userId: string, params: UpdateTeamParams): Promise<Team>

  /** Delete a team (owner-only). */
  deleteTeam(teamId: string, userId: string): Promise<void>

  /** Get members of a team. */
  getMembers(teamId: string, userId: string): Promise<TeamMember[]>

  /** Add a member to a team (admin-only). */
  addMember(
    teamId: string,
    userId: string,
    targetUserId: string,
    role?: 'admin' | 'member',
  ): Promise<TeamMember>

  /** Remove a member from a team (admin-only). */
  removeMember(teamId: string, userId: string, targetUserId: string): Promise<void>

  /** Update a member's role (admin-only). */
  updateMemberRole(
    teamId: string,
    userId: string,
    targetUserId: string,
    newRole: 'admin' | 'member',
  ): Promise<TeamMember>

  /** Get the user's role in a team. */
  getUserRole(teamId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null>
}
