import { Item, SyncSource } from './item'

/**
 * File Types - These represent the types of content that can be opened in tabs
 */
export type FileType =
  | 'document' // Text documents
  | 'word_document' // Word documents (.docx)
  | 'presentation' // PowerPoint presentations (.pptx)
  | 'table' // Spreadsheets/tables (CSV)
  | 'spreadsheet' // Excel files (xlsx, xls)
  | 'slides' // Presentations
  | 'mindmap' // Concept maps
  | 'math' // Equations, formulas
  | 'map' // Location/maps
  | 'email' // Email & Messages
  | 'chat' // AI conversation
  // Imported file types
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'other'
  // Special file types
  | 'v0_project' // V0 projects
  | 'sqlite_database' // SQLite databases
  | 'knowledge_graph' // Memory package viewer
  // Virtual collection types (integrated as files)
  | 'agents_collection' // Virtual folder for agents
  | 'agent_create' // Create new agent view
  | 'agent_detail' // Agent detail view
  | 'sources_collection' // Virtual folder for MCP sources
  | 'source_create' // Create new source view
  | 'source_detail' // Source detail view
  | 'activity_collection' // Virtual folder for activity logs
  | 'approvals_collection' // Virtual folder for pending approvals
  | 'activity_detail' // Activity log detail view
  | 'workspace_collection' // Virtual folder for workspace configuration
  | 'agent_config' // Individual agent configuration file
  | 'agent_folder' // Agent folder (existing type)
  | 'discord_settings' // Discord integration settings

/**
 * File model - extends the base Item
 */
export interface File extends Item {
  type: 'file'
  name: string
  path: string
  fileType: FileType
  size?: number
  content?: string
  thumbnailUrl?: string
  preview?: string | null
  syncSource?: SyncSource
  lastSynced?: string
  file_labels?: {
    id: string
    label_id: string
    labels: {
      id: string
      name: string
      color: string
      description?: string
    }
  }[]
}

/**
 * Create a new File with default values
 */
export function createFile(partial: Partial<File> | any = {}): File {
  const now = new Date().toISOString()
  const name = partial.name || 'untitled'
  const path = partial.path || '/'

  // Handle both camelCase (fileType) and snake_case (file_type) from Supabase
  const fileType = partial.fileType || partial.file_type || 'document'

  // Extract full label objects from joined data
  const labelData = partial.file_labels || []
  const labels = Array.isArray(labelData)
    ? labelData
        ?.map((labelAssoc: any) => ({
          id: labelAssoc.labels?.id || labelAssoc.label_id,
          name: labelAssoc.labels?.name || '',
          color: labelAssoc.labels?.color || '#0098FC',
          description: labelAssoc.labels?.description,
          workspaceId: partial.workspaceId || partial.workspace_id || '',
          createdAt: labelAssoc.labels?.created_at || now,
          updatedAt: labelAssoc.labels?.updated_at || now,
        }))
        .filter((l) => l.id) // Filter out any invalid labels
    : partial.labels || []

  return {
    id:
      partial.id ||
      Date.now().toString(36) + Math.random().toString(36).substring(2),
    type: 'file',
    name,
    path,
    fileType,
    size: partial.size || 0,
    content: partial.content,
    thumbnailUrl: partial.thumbnailUrl || partial.thumbnail_url,
    preview: partial.preview,
    syncSource: partial.syncSource,
    lastSynced: partial.lastSynced,
    icon: getFileTypeIcon(fileType),
    iconBg: 'bg-gray-100',
    isTagged: partial.isTagged,
    isCurrent: partial.isCurrent,
    workspaceId: partial.workspaceId || partial.workspace_id || '',
    createdAt: partial.createdAt || partial.created_at || now,
    updatedAt: partial.updatedAt || partial.updated_at || now,
    metadata: partial.metadata || {},
    labels,
    file_labels: partial.file_labels || [],
  }
}

/**
 * Get icon for file type
 * Returns either a React component or a special marker string for legacy support
 */
export function getFileTypeIcon(type: FileType): string {
  // Special case for knowledge_graph - return special marker for tabs
  if (type === 'knowledge_graph') {
    return 'PACKAGE_ICON' // Special marker that will be handled by tabs component
  }

  // Special markers for virtual collections
  if (type === 'agents_collection') {
    return 'AGENTS_ICON'
  }
  if (type === 'sources_collection') {
    return 'SOURCES_ICON'
  }
  if (type === 'activity_collection') {
    return 'ACTIVITY_ICON'
  }
  if (type === 'approvals_collection') {
    return 'APPROVALS_ICON'
  }
  if (type === 'workspace_collection') {
    return 'WORKSPACE_ICON'
  }

  // Return special markers for Remix icon types
  // Components should use getFileTypeIconComponent from lib/file-icons.tsx instead
  const iconMap: Record<FileType, string> = {
    document: 'REMIX_ICON_DOCUMENT',
    word_document: 'REMIX_ICON_DOCUMENT',
    presentation: 'REMIX_ICON_SLIDES',
    table: 'REMIX_ICON_TABLE',
    spreadsheet: 'REMIX_ICON_TABLE',
    slides: 'REMIX_ICON_SLIDES',
    mindmap: 'REMIX_ICON_MINDMAP',
    math: 'REMIX_ICON_MATH',
    map: 'REMIX_ICON_MAP',
    email: 'REMIX_ICON_EMAIL',
    chat: 'REMIX_ICON_CHAT',
    pdf: 'REMIX_ICON_PDF',
    image: 'REMIX_ICON_IMAGE',
    video: 'REMIX_ICON_VIDEO',
    audio: 'REMIX_ICON_AUDIO',
    archive: 'REMIX_ICON_ARCHIVE',
    code: 'REMIX_ICON_CODE',
    other: 'REMIX_ICON_OTHER',
    v0_project: 'REMIX_ICON_V0_PROJECT',
    sqlite_database: 'REMIX_ICON_SQLITE_DATABASE',
    knowledge_graph: 'PACKAGE_ICON',
    agents_collection: 'AGENTS_ICON',
    agent_create: 'AGENT_CREATE_ICON',
    agent_detail: 'AGENT_DETAIL_ICON',
    sources_collection: 'SOURCES_ICON',
    source_create: 'SOURCE_CREATE_ICON',
    source_detail: 'SOURCE_DETAIL_ICON',
    activity_collection: 'ACTIVITY_ICON',
    approvals_collection: 'APPROVALS_ICON',
    activity_detail: 'ACTIVITY_DETAIL_ICON',
    workspace_collection: 'WORKSPACE_ICON',
    agent_config: 'REMIX_ICON_AGENT_CONFIG',
    agent_folder: 'REMIX_ICON_AGENT_FOLDER',
    discord_settings: 'DISCORD_SETTINGS_ICON',
  }

  return iconMap[type] || 'REMIX_ICON_OTHER'
}

/**
 * Get default file name based on type
 */
export function getDefaultFileName(type: FileType): string {
  const nameMap: Record<FileType, string> = {
    document: 'New document',
    word_document: 'New document',
    presentation: 'New presentation',
    table: 'New spreadsheet',
    spreadsheet: 'New spreadsheet',
    slides: 'New presentation',
    mindmap: 'New mind map',
    math: 'New formula',
    map: 'New map',
    email: 'New email',
    chat: 'Ask Lazarus',
    pdf: 'Imported PDF',
    image: 'Imported image',
    video: 'Imported video',
    audio: 'Imported audio',
    archive: 'Imported archive',
    code: 'Imported code',
    other: 'Imported file',
    v0_project: 'V0 Project',
    sqlite_database: 'SQLite Database',
    knowledge_graph: 'Memory package',
    agents_collection: 'Agents',
    agent_create: 'New Agent',
    agent_detail: 'Agent details',
    sources_collection: 'Tools',
    source_create: 'Add Tool',
    source_detail: 'Tool Details',
    activity_collection: 'Activity',
    approvals_collection: 'Approvals',
    activity_detail: 'Activity Details',
    workspace_collection: 'Workspace',
    agent_config: 'Agent',
    agent_folder: 'Agent',
    discord_settings: 'Discord Settings',
  }

  return nameMap[type]
}

/**
 * Get human-readable display name for file type
 */
export function getFileTypeDisplayName(type: FileType): string {
  const displayNameMap: Record<FileType, string> = {
    document: 'Document',
    word_document: 'Document',
    presentation: 'Presentation',
    table: 'Spreadsheet',
    spreadsheet: 'Spreadsheet',
    slides: 'Presentation',
    mindmap: 'Mind Map',
    math: 'Math & Formulas',
    map: 'Location',
    email: 'Email & Messages',
    chat: 'Chat',
    pdf: 'PDF Document',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    archive: 'Archive',
    code: 'Code',
    other: 'File',
    v0_project: 'V0 Project',
    sqlite_database: 'SQLite Database',
    knowledge_graph: 'Memory package',
    agents_collection: 'Agents',
    agent_create: 'New Agent',
    agent_detail: 'Agent details',
    sources_collection: 'Tools',
    source_create: 'Add Tool',
    source_detail: 'Tool Details',
    activity_collection: 'Activity',
    approvals_collection: 'Approvals',
    activity_detail: 'Activity Details',
    workspace_collection: 'Workspace',
    agent_config: 'Agent Configuration',
    agent_folder: 'Agent',
    discord_settings: 'Discord Settings',
  }

  return displayNameMap[type] || 'File'
}
