import { isVirtualFolderPath } from '@/lib/virtual-folders'

export type FileType =
  | 'document'
  | 'word_document'
  | 'presentation'
  | 'mindmap'
  | 'table'
  | 'spreadsheet'
  | 'text'
  | 'code'
  | 'markdown'
  | 'json'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'binary'
  | 'unsupported'
  | 'v0_project'
  | 'sqlite_database'
  | 'slides'
  | 'knowledge_graph'
  | 'agent_config'
  | 'agent_folder'
  | 'agents_collection'
  | 'agent_create'
  | 'agent_detail'
  | 'sources_collection'
  | 'source_create'
  | 'source_detail'
  | 'activity_collection'
  | 'activity_detail'
  | 'workspace_config'
  | 'workspace_collection'
  | 'approvals_collection'
  | 'discord_settings'
  | 'get_started'

export function getFileTypeFromName(fileName: string): FileType {
  const normalized = fileName.toLowerCase()

  // Check for virtual collection paths (no longer using __virtual__ prefix)
  if (normalized === 'agents' || normalized.endsWith('/agents')) {
    return 'agents_collection'
  }
  if (normalized === 'agent/new' || normalized.endsWith('/agent/new')) {
    return 'agent_create'
  }
  if (normalized.includes('/agent/') && !normalized.endsWith('/new')) {
    return 'agent_detail'
  }
  if (normalized === 'sources' || normalized.endsWith('/sources')) {
    return 'sources_collection'
  }
  if (normalized === 'source/new' || normalized.endsWith('/source/new')) {
    return 'source_create'
  }
  if (normalized.includes('/source/') && !normalized.endsWith('/new')) {
    return 'source_detail'
  }
  if (normalized === 'activity' || normalized.endsWith('/activity')) {
    return 'activity_collection'
  }
  if (normalized === 'approvals' || normalized.endsWith('/approvals')) {
    return 'approvals_collection'
  }
  if (normalized.includes('/activity/') && !normalized.endsWith('/activity')) {
    return 'activity_detail'
  }
  if (normalized === 'workspace' || normalized.endsWith('/workspace')) {
    return 'workspace_collection'
  }
  if (normalized.includes('discord-settings/')) {
    return 'discord_settings'
  }
  if (normalized === 'get-started' || normalized.endsWith('/get-started')) {
    return 'get_started'
  }

  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension) return 'document'

  // Check for knowledge graph folder (special handling)
  if (isKnowledgeFolder(fileName)) {
    return 'knowledge_graph'
  }

  // Check for workspace config files
  if (isWorkspaceConfig(fileName)) {
    return 'workspace_config'
  }

  // Check for agent config files
  if (isAgentConfig(fileName)) {
    return 'agent_config'
  }

  // Check for agent folders
  if (isAgentFolder(fileName)) {
    return 'agent_folder'
  }

  // Check for v0 projects first (path-based detection)
  if (isV0Project(fileName)) {
    return 'v0_project'
  }

  // Check for SQLite databases
  if (isSQLiteDatabase(fileName)) {
    return 'sqlite_database'
  }

  // Word documents (.docx, .doc)
  if (['doc', 'docx'].includes(extension)) {
    return 'word_document'
  }

  // PowerPoint presentations (.pptx, .ppt)
  if (['ppt', 'pptx'].includes(extension)) {
    return 'presentation'
  }

  // Studio-specific file types (matching studio behavior)
  if (['document'].includes(extension)) {
    return 'document'
  }

  if (['mindmap', 'mind'].includes(extension)) {
    return 'mindmap'
  }

  // Excel spreadsheets (xlsx, xls) - binary files that need special handling
  if (['xlsx', 'xls'].includes(extension)) {
    return 'spreadsheet'
  }

  // CSV and other table formats - text-based
  if (['table', 'spreadsheet', 'csv'].includes(extension)) {
    return 'table'
  }

  // Slides/Presentation files
  if (['slides', 'slide', 'presentation', 'pres'].includes(extension)) {
    return 'slides'
  }

  // Text files
  if (['txt', 'log', 'cfg', 'conf', 'ini'].includes(extension)) {
    return 'text'
  }

  // Markdown files
  if (['md', 'markdown', 'mdx'].includes(extension)) {
    return 'markdown'
  }

  // Code files
  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'java',
      'cpp',
      'c',
      'h',
      'hpp',
      'css',
      'scss',
      'sass',
      'less',
      'html',
      'htm',
      'xml',
      'svg',
      'php',
      'rb',
      'go',
      'rs',
      'sh',
      'bash',
      'zsh',
      'sql',
      'yaml',
      'yml',
      'toml',
      'dockerfile',
      'gitignore',
      'env',
    ].includes(extension)
  ) {
    return 'code'
  }

  // JSON files
  if (['json', 'jsonc'].includes(extension)) {
    return 'json'
  }

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'].includes(extension)) {
    return 'image'
  }

  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
    return 'video'
  }

  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(extension)) {
    return 'audio'
  }

  // PDF
  if (extension === 'pdf') {
    return 'pdf'
  }

  // Binary files (archives, executables)
  if (
    [
      'exe',
      'dll',
      'so',
      'dylib',
      'bin',
      'zip',
      'rar',
      '7z',
      'tar',
      'gz',
    ].includes(extension)
  ) {
    return 'binary'
  }

  return 'text' // Default to text for unknown extensions
}

export function isEditableFileType(fileType: FileType): boolean {
  return [
    'document',
    'mindmap',
    'table',
    'spreadsheet',
    'text',
    'code',
    'markdown',
    'json',
    'slides',
  ].includes(fileType)
}

export function getLanguageFromExtension(extension: string): string {
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    svg: 'xml',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    json: 'json',
    jsonc: 'json',
    md: 'markdown',
    markdown: 'markdown',
    mdx: 'markdown',
  }

  return langMap[extension.toLowerCase()] || 'text'
}

/**
 * Check if a file is a V0 project (app file)
 * V0 projects use .app extension
 */
export function isV0Project(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.app')
}

/**
 * Check if a file is a SQLite database
 * SQLite databases use .db extension
 */
export function isSQLiteDatabase(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.db')
}

/**
 * Check if a path is the knowledge graph folder or virtual file
 * Knowledge graphs are stored in .knowledge directory
 * Only matches the folder itself, not files inside it
 */
export function isKnowledgeFolder(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  // Match the .knowledge folder itself, or the virtual "Memory package" / "Knowledge Graph" file
  return (
    normalized === '.knowledge' ||
    normalized.endsWith('/.knowledge') ||
    normalized.includes('memory package') ||
    normalized.includes('knowledge graph')
  )
}

/**
 * Check if a file is an agent configuration file
 * Agent configs use .agent.json extension or config.agent.json name
 */
export function isAgentConfig(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  return (
    normalized.endsWith('.agent.json') ||
    normalized.endsWith('/config.agent.json') ||
    normalized === 'config.agent.json'
  )
}

/**
 * Check if a path is an agent folder
 * Agent folders are in /agents/ directory or /.system/agents/ directory
 */
export function isAgentFolder(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  return (
    normalized.includes('/agents/') ||
    normalized.includes('/.system/agents/') ||
    normalized.startsWith('agents/')
  )
}

/**
 * Check if a file is a workspace configuration file
 * Workspace configs use .workspace.json name
 */
export function isWorkspaceConfig(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  return (
    normalized === '.workspace.json' || normalized.endsWith('/.workspace.json')
  )
}

/**
 * Check if a file is a virtual file (Agents, Sources, Activity, Approvals, Workspace)
 * Virtual files are now backend-generated with simple paths
 */
export function isVirtualFile(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  return (
    isVirtualFolderPath(normalized) ||
    normalized.includes('/agent/') ||
    normalized.includes('/source/')
  )
}
