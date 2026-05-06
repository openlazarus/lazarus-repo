import type { WorkspaceLookupRow } from './agent.repository'

export interface IAgentRepository {
  /** Look up a workspace by its ID. */
  getWorkspaceLookupById(workspaceId: string): Promise<WorkspaceLookupRow | null>
  /** Look up a workspace by its slug. */
  getWorkspaceLookupBySlug(slug: string): Promise<WorkspaceLookupRow | null>
  /** Get the personal (default) workspace ID for a user. */
  getUserPersonalTeamId(userId: string): Promise<string | null>
}
