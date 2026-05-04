/**
 * Centralized virtual folder registry.
 *
 * Virtual folders (Agents, Tools, Activity, Approvals, Workspace) are
 * UI-only constructs injected by the backend into file listings.
 * They have no file on disk — the frontend renders dedicated viewer
 * components for them.
 *
 * When adding a new virtual folder, update:
 *   1. VIRTUAL_FOLDER_PATHS here (auto-propagates to isSpecialView, sortFiles, isVirtualFile)
 *   2. VIRTUAL_FILE_TYPES here (auto-propagates to layout-file-editor skip lists)
 *   3. file-type-detector.ts — add path → type mapping in getFileTypeFromName()
 *   3b. app/(main)/page.tsx — add path → type mapping in getFileType()
 *   4. file-system-editor.tsx — add switch case routing to viewer component
 *   5. model/file.ts — add to FileType union, icon map, display name maps
 *   6. lib/file-icons.tsx — add icon component case
 *   7. Backend workspaces.ts — add files.push() + virtual path block
 */

/** Paths that identify virtual folders in the file tree */
export const VIRTUAL_FOLDER_PATHS = [
  'agents',
  'sources',
  'activity',
  'approvals',
  'workspace',
] as const

export type VirtualFolderPath = (typeof VIRTUAL_FOLDER_PATHS)[number]

const virtualFolderSet = new Set<string>(VIRTUAL_FOLDER_PATHS)

/**
 * File types that are virtual — they skip content loading and get special
 * routing in the file-system-editor. This includes both top-level collections
 * and sub-views (create, detail).
 */
export const VIRTUAL_FILE_TYPES = [
  'agents_collection',
  'agent_create',
  'agent_detail',
  'sources_collection',
  'source_create',
  'source_detail',
  'activity_collection',
  'approvals_collection',
  'activity_detail',
  'workspace_collection',
  'discord_settings',
  'get_started',
  'knowledge_graph',
] as const

/**
 * Check if a file path is a virtual folder path.
 * Matches both exact paths ("agents") and suffixed paths ("workspace/agents").
 */
export function isVirtualFolderPath(filePath: string): boolean {
  const normalized = filePath.toLowerCase()
  if (virtualFolderSet.has(normalized)) return true
  const lastSegment = normalized.split('/').pop() || ''
  return virtualFolderSet.has(lastSegment)
}
