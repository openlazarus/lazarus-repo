import type { Workspace, WorkspaceFile } from '@domains/workspace/types/workspace.types'

export interface IWorkspaceManager {
  /** List all workspaces for a user. */
  listWorkspaces(userId: string): Promise<Workspace[]>

  /** Get a specific workspace. */
  getWorkspace(workspaceId: string, userId: string): Promise<Workspace | null>

  /** Get or create the default workspace for a user. */
  getOrCreateDefaultWorkspace(userId: string): Promise<Workspace>

  /** Create a new workspace. */
  createWorkspace(
    name: string,
    ownerId: string,
    description?: string,
    mcpServers?: string[],
    templateId?: string,
  ): Promise<Workspace>

  /** Update workspace metadata. */
  updateWorkspace(workspace: Workspace): Promise<void>

  /** Delete a workspace. */
  deleteWorkspace(workspaceId: string, userId: string): Promise<boolean>

  /** Transfer workspace ownership to another user. */
  transferWorkspace(
    workspaceId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean>

  /** Permanently delete a workspace from trash. */
  permanentlyDeleteWorkspace(workspaceId: string): Promise<boolean>

  /** List files in a workspace. */
  listFiles(workspacePath: string, relativePath?: string): Promise<WorkspaceFile[]>

  /** Recursively search files in a workspace by name. */
  searchFiles(workspacePath: string, query: string, maxResults?: number): Promise<WorkspaceFile[]>

  /** Read a file from workspace. */
  readFile(
    workspacePath: string,
    filePath: string,
  ): Promise<{ content: string; encoding: 'utf-8' | 'base64'; size: number }>

  /** Write a file to workspace. */
  writeFile(
    workspacePath: string,
    filePath: string,
    content: string,
    encoding?: 'utf-8' | 'base64',
  ): Promise<void>

  /** Delete a file or directory from workspace. */
  deleteFile(workspacePath: string, filePath: string): Promise<void>

  /** Move a file or directory within a workspace. */
  moveFile(workspacePath: string, sourcePath: string, destinationPath: string): Promise<void>

  /** Get workspace context for AI. */
  getWorkspaceContext(workspace: Workspace): Promise<string>

  /** Sync a workspace from filesystem to Supabase. */
  syncWorkspaceToSupabase(
    workspacePath: string,
    userId: string,
  ): Promise<{ success: boolean; workspaceId?: string; error?: string }>
}
