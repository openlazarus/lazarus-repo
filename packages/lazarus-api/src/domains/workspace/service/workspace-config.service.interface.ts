import type { WorkspaceConfig } from '@domains/workspace/types/workspace.types'

export interface IWorkspaceConfigService {
  /** Get the path to the workspace config file. */
  getConfigPath(workspacePath: string): string

  /** Get workspace configuration (auto-creates from DB slug if missing). */
  getConfig(workspacePath: string, workspaceId: string): Promise<WorkspaceConfig>

  /** Update workspace configuration. */
  updateConfig(
    workspacePath: string,
    workspaceId: string,
    updates: Partial<WorkspaceConfig>,
  ): Promise<WorkspaceConfig>

  /** Validate a workspace slug for format and uniqueness. */
  validateSlug(
    slug: string,
    currentWorkspaceId?: string,
  ): Promise<{ valid: boolean; error?: string }>

  /** Check if a slug exists across all workspaces. */
  checkSlugExists(slug: string, excludeWorkspaceId?: string): Promise<boolean>
}
