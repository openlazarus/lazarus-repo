import type { AgentMetadata } from '@domains/agent/types/agent.types'

export interface IAgentLookupService {
  /** Get workspace information by ID. */
  getWorkspaceById(
    workspaceId: string,
  ): Promise<{
    id: string
    slug: string | null
    user_id: string
    settings?: { path?: string } | null
    path?: string
  } | null>

  /** Get workspace information by slug. */
  getWorkspaceBySlug(
    slug: string,
  ): Promise<{
    id: string
    slug: string | null
    user_id: string
    settings?: { path?: string } | null
    path?: string
  } | null>

  /** Check if an agent exists in a workspace. */
  agentExists(workspaceId: string, agentId: string): Promise<boolean>

  /** Check if an agent exists by workspace slug and agent ID. */
  agentExistsBySlug(workspaceSlug: string, agentId: string): Promise<boolean>

  /** Get agent metadata by workspace ID and agent ID. */
  getAgentMetadata(workspaceId: string, agentId: string): Promise<AgentMetadata | null>

  /** Get agent metadata by workspace slug. */
  getAgentMetadataBySlug(workspaceSlug: string, agentId: string): Promise<AgentMetadata | null>

  /** List all enabled agents in a workspace. */
  listEnabledAgents(workspaceId: string): Promise<AgentMetadata[]>

  /** Parse an agent email address into workspace slug and agent ID. */
  parseAgentEmail(emailAddress: string): { workspaceSlug: string; agentId: string } | null

  /** Validate agent email address (format and existence). */
  validateAgentEmail(emailAddress: string): Promise<boolean>
}
